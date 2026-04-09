import { NextResponse } from "next/server"
import {
  getClearedLocalAuthSessionCookie,
  getLocalAuthSessionCookie,
  normalizeLocalAuthEmail,
  verifyLocalPassword,
} from "@/lib/local-auth"
import {
  getClearedCurrentGameCookie,
  getClearedCurrentOrgCookie,
} from "@/lib/auth"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { prisma } from "@/lib/prisma"

function getSafeRedirectUrl(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return fallback
  }

  return value
}

function buildErrorRedirect(
  req: Request,
  pathname: string,
  redirectUrl: string,
  error: string
) {
  const url = new URL(pathname, req.url)
  url.searchParams.set("error", error)
  url.searchParams.set("redirect_url", redirectUrl)
  return NextResponse.redirect(url, { status: 303 })
}

export async function POST(req: Request) {
  if (!isSelfHostedMode()) {
    return NextResponse.redirect(new URL("/sign-in", req.url), { status: 303 })
  }

  const formData = await req.formData()
  const redirectUrl = getSafeRedirectUrl(formData.get("redirect_url"), "/dashboard")
  const email = normalizeLocalAuthEmail(String(formData.get("email") ?? ""))
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return buildErrorRedirect(req, "/login", redirectUrl, "invalid")
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  })

  if (!user || !verifyLocalPassword(password, user.passwordHash)) {
    return buildErrorRedirect(req, "/login", redirectUrl, "invalid")
  }

  const response = NextResponse.redirect(new URL(redirectUrl, req.url), {
    status: 303,
  })

  response.cookies.set(getClearedLocalAuthSessionCookie())
  response.cookies.set(getClearedCurrentOrgCookie())
  response.cookies.set(getClearedCurrentGameCookie())
  response.cookies.set(getLocalAuthSessionCookie(user.id))

  return response
}
