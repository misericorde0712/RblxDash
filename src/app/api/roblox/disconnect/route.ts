import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { upsertDbUserFromClerkUser } from "@/lib/auth"
import {
  decryptRobloxOAuthSecret,
  revokeRobloxRefreshToken,
} from "@/lib/roblox-oauth"

function getSafeRedirectTo(value: FormDataEntryValue | null) {
  const candidate = typeof value === "string" ? value : null

  if (!candidate?.startsWith("/")) {
    return "/account"
  }

  return candidate
}

export async function POST(req: NextRequest) {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return NextResponse.redirect(new URL("/login", req.url), { status: 303 })
  }

  const dbUser = await upsertDbUserFromClerkUser(clerkUser)
  const redirectTo = getSafeRedirectTo((await req.formData()).get("redirectTo"))
  const existingConnection = await prisma.robloxConnection.findUnique({
    where: { userId: dbUser.id },
  })

  if (existingConnection) {
    await revokeRobloxRefreshToken(
      decryptRobloxOAuthSecret(existingConnection.refreshToken)
    )
    await prisma.robloxConnection.delete({
      where: { userId: dbUser.id },
    })
  }

  return NextResponse.redirect(
    new URL(`${redirectTo}?roblox=disconnected`, req.url),
    { status: 303 }
  )
}
