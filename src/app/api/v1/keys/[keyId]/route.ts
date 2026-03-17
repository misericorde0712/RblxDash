import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { apiError, apiSuccess } from "@/lib/api-auth"
import { getPlanFromSubscription } from "@/lib/stripe"
import { getCurrentOrgForApi } from "@/lib/auth"

// DELETE /api/v1/keys/:keyId — révoquer une clé
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const clerkUser = await currentUser()
  if (!clerkUser) return apiError("UNAUTHORIZED", "Not authenticated.", 401)

  const ctx = await getCurrentOrgForApi()
  if ("response" in ctx) return ctx.response

  const subscription = await prisma.subscription.findUnique({
    where: { userId: ctx.context.org.billingOwnerId },
  })
  const planConfig = getPlanFromSubscription(subscription ?? null)
  if (!planConfig.apiAccess) {
    return apiError("FORBIDDEN", "API access requires a Studio plan.", 403)
  }

  const { keyId } = await params

  const apiKey = await prisma.apiKey.findFirst({
    where: { id: keyId, orgId: ctx.context.org.id },
  })

  if (!apiKey) {
    return apiError("NOT_FOUND", "API key not found.", 404)
  }

  if (apiKey.revokedAt) {
    return apiError("BAD_REQUEST", "This key is already revoked.", 400)
  }

  await prisma.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })

  return apiSuccess({ id: keyId, revoked: true })
}
