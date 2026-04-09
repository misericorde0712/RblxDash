import { currentUser } from "@/lib/auth-provider/server"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/request-url"
import { upsertDbUserFromClerkUser } from "@/lib/auth"
import { upsertRobloxConnectionFromToken } from "@/lib/roblox-connection"
import { exchangeRobloxAuthorizationCode } from "@/lib/roblox-oauth"
import { createLogger } from "@/lib/logger"

const log = createLogger("roblox/oauth/callback")

const ROBLOX_OAUTH_STATE_COOKIE = "rblxdash_roblox_oauth_state"
const ROBLOX_OAUTH_VERIFIER_COOKIE = "rblxdash_roblox_oauth_verifier"
const ROBLOX_OAUTH_REDIRECT_COOKIE = "rblxdash_roblox_oauth_redirect"

function appendStatus(pathname: string, status: string, details?: string) {
  const url = new URL(pathname, "http://localhost")
  url.searchParams.set("roblox", status)

  if (details) {
    url.searchParams.set("details", details)
  }

  return `${url.pathname}${url.search}`
}

function clearRobloxOauthCookies(response: NextResponse) {
  for (const name of [
    ROBLOX_OAUTH_STATE_COOKIE,
    ROBLOX_OAUTH_VERIFIER_COOKIE,
    ROBLOX_OAUTH_REDIRECT_COOKIE,
  ]) {
    response.cookies.set({
      name,
      value: "",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    })
  }
}

export async function GET(req: NextRequest) {
  const clerkUser = await currentUser()
  const appUrl = getRequestOrigin(req)

  if (!clerkUser) {
    return NextResponse.redirect(
      new URL(`/login?redirect_url=${encodeURIComponent("/account")}`, appUrl),
      { status: 303 }
    )
  }

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(ROBLOX_OAUTH_STATE_COOKIE)?.value
  const codeVerifier = cookieStore.get(ROBLOX_OAUTH_VERIFIER_COOKIE)?.value
  const redirectTo =
    cookieStore.get(ROBLOX_OAUTH_REDIRECT_COOKIE)?.value || "/account"
  const state = req.nextUrl.searchParams.get("state")
  const code = req.nextUrl.searchParams.get("code")
  const error = req.nextUrl.searchParams.get("error")
  const errorDescription = req.nextUrl.searchParams.get("error_description")

  if (error) {
    const response = NextResponse.redirect(
      new URL(appendStatus(redirectTo, "error", errorDescription || error), appUrl),
      { status: 303 }
    )
    clearRobloxOauthCookies(response)
    return response
  }

  if (!state || !expectedState || state !== expectedState || !codeVerifier || !code) {
    const response = NextResponse.redirect(
      new URL(appendStatus(redirectTo, "error", "invalid-state"), appUrl),
      { status: 303 }
    )
    clearRobloxOauthCookies(response)
    return response
  }

  try {
    const dbUser = await upsertDbUserFromClerkUser(clerkUser)
    const redirectUri = `${appUrl}/api/roblox/oauth/callback`
    const tokenResponse = await exchangeRobloxAuthorizationCode({
      code,
      codeVerifier,
      redirectUri,
    })

    await upsertRobloxConnectionFromToken({
      userId: dbUser.id,
      tokenResponse,
    })

    const response = NextResponse.redirect(
      new URL(appendStatus(redirectTo, "connected"), appUrl),
      { status: 303 }
    )
    clearRobloxOauthCookies(response)
    return response
  } catch (error) {
    log.error("OAuth callback failed", {}, error instanceof Error ? error : undefined)

    const response = NextResponse.redirect(
      new URL(
        appendStatus(
          redirectTo,
          "error",
          error instanceof Error ? error.message : "oauth-failed"
        ),
        appUrl
      ),
      { status: 303 }
    )
    clearRobloxOauthCookies(response)
    return response
  }
}
