import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { currentUser } from "@/lib/auth-provider/server"
import { prisma } from "@/lib/prisma"
import { generateApiKey, hashApiKey, getKeyDisplayPrefix } from "@/lib/api-key"
import { apiError, apiSuccess, apiCreated } from "@/lib/api-auth"
import { getPlanFromSubscription } from "@/lib/stripe"
import { getCurrentOrgForApi } from "@/lib/auth"

const CreateKeySchema = z.object({
  name: z.string().min(1).max(100),
})

// GET /api/v1/keys — liste les clés de l'org courante (sans hash)
export async function GET(req: NextRequest) {
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

  const keys = await prisma.apiKey.findMany({
    where: { orgId: ctx.context.org.id, revokedAt: null },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return apiSuccess(keys)
}

// POST /api/v1/keys — crée une clé (retourne la clé brute une seule fois)
export async function POST(req: NextRequest) {
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

  const body = await req.json().catch(() => ({}))
  const parsed = CreateKeySchema.safeParse(body)
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid input.", 400)
  }

  const rawKey = generateApiKey()
  const keyHash = hashApiKey(rawKey)
  const keyPrefix = getKeyDisplayPrefix(rawKey)

  const apiKey = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      orgId: ctx.context.org.id,
      createdById: ctx.context.dbUser.id,
    },
  })

  return NextResponse.json(
    {
      data: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey,
        prefix: keyPrefix,
        createdAt: apiKey.createdAt,
      },
      warning: "Store this key securely. It will not be shown again.",
    },
    { status: 201 }
  )
}
