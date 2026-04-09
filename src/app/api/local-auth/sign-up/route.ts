import { NextResponse } from "next/server"
import {
  getLocalAuthClerkId,
  getLocalAuthSessionCookie,
  hashLocalPassword,
  normalizeLocalAuthEmail,
} from "@/lib/local-auth"
import {
  getClearedCurrentGameCookie,
  getClearedCurrentOrgCookie,
} from "@/lib/auth"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { prisma } from "@/lib/prisma"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSafeRedirectUrl(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return fallback
  }

  return value
}

function buildErrorRedirect(
  req: Request,
  redirectUrl: string,
  error: string
) {
  const url = new URL("/register", req.url)
  url.searchParams.set("error", error)
  url.searchParams.set("redirect_url", redirectUrl)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(req: Request) {
  if (!isSelfHostedMode()) {
    return NextResponse.redirect(new URL("/sign-up", req.url), { status: 303 })
  }

  const formData = await req.formData()
  const redirectUrl = getSafeRedirectUrl(formData.get("redirect_url"), "/onboarding")
  const name = String(formData.get("name") ?? "").trim()
  const rawEmail = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!name || !rawEmail || !password) {
    return buildErrorRedirect(req, redirectUrl, "missing-fields")
  }

  if (!EMAIL_PATTERN.test(rawEmail)) {
    return buildErrorRedirect(req, redirectUrl, "invalid-email")
  }

  if (password.length < 8) {
    return buildErrorRedirect(req, redirectUrl, "weak-password")
  }

  const email = normalizeLocalAuthEmail(rawEmail)
  const passwordHash = hashLocalPassword(password)
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      passwordHash: true,
    },
  })

  if (existingUser?.passwordHash) {
    return buildErrorRedirect(req, redirectUrl, "exists")
  }

  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          passwordHash,
          name: existingUser.name?.trim() ? existingUser.name : name,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          clerkId: getLocalAuthClerkId(email),
          email,
          name,
          passwordHash,
        },
        select: { id: true },
      })

  const response = NextResponse.redirect(new URL(redirectUrl, req.url), {
    status: 303,
  })

  response.cookies.set(getClearedCurrentOrgCookie())
  response.cookies.set(getClearedCurrentGameCookie())
  response.cookies.set(getLocalAuthSessionCookie(user.id))

  return response
}
