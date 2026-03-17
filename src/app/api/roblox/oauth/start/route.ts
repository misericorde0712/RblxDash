import { auth, currentUser } from "@clerk/nextjs/server"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { getRequestOrigin } from "@/lib/request-url"
import {
  buildRobloxOAuthAuthorizationUrl,
  createPkceCodeChallenge,
  createPkceCodeVerifier,
  createRobloxOAuthState,
  isRobloxOAuthConfigured,
} from "@/lib/roblox-oauth"

const ROBLOX_OAUTH_STATE_COOKIE = "rblxdash_roblox_oauth_state"
const ROBLOX_OAUTH_VERIFIER_COOKIE = "rblxdash_roblox_oauth_verifier"
const ROBLOX_OAUTH_REDIRECT_COOKIE = "rblxdash_roblox_oauth_redirect"
const COOKIE_MAX_AGE = 60 * 10

function getSafeRedirectTo(value: string | null) {
  if (!value?.startsWith("/")) {
    return "/account"
  }

  return value
}

export async function GET(req: NextRequest) {
  if (!isRobloxOAuthConfigured()) {
    return NextResponse.redirect(new URL("/account?roblox=not-configured", req.url), {
      status: 303,
    })
  }

  const { userId } = await auth()
  const clerkUser = await currentUser()

  if (!userId || !clerkUser) {
    return NextResponse.redirect(
      new URL(
        `/login?redirect_url=${encodeURIComponent("/account")}`,
        req.url
      ),
      { status: 303 }
    )
  }

  const state = createRobloxOAuthState()
  const codeVerifier = createPkceCodeVerifier()
  const codeChallenge = createPkceCodeChallenge(codeVerifier)
  const appUrl = getRequestOrigin(req)
  const redirectUri = `${appUrl}/api/roblox/oauth/callback`
  const redirectTo = getSafeRedirectTo(req.nextUrl.searchParams.get("redirectTo"))
  const authorizationUrl = buildRobloxOAuthAuthorizationUrl({
    redirectUri,
    state,
    codeChallenge,
  })

  const response = NextResponse.redirect(authorizationUrl, { status: 303 })
  response.cookies.set({
    name: ROBLOX_OAUTH_STATE_COOKIE,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
  response.cookies.set({
    name: ROBLOX_OAUTH_VERIFIER_COOKIE,
    value: codeVerifier,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })
  response.cookies.set({
    name: ROBLOX_OAUTH_REDIRECT_COOKIE,
    value: redirectTo,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  })

  return response
}

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete(ROBLOX_OAUTH_STATE_COOKIE)
  cookieStore.delete(ROBLOX_OAUTH_VERIFIER_COOKIE)
  cookieStore.delete(ROBLOX_OAUTH_REDIRECT_COOKIE)

  return GET(req)
}
