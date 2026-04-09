import {
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { toAbsoluteUrl } from "@/lib/request-url"
import {
  checkRateLimit,
  getRateLimitKey,
  RATE_LIMITS,
  withRateLimitHeaders,
} from "@/lib/rate-limit"
import {
  getMaintenancePageHtml,
  getMaintenanceResponse,
  isIpAllowed,
  isMaintenanceMode,
} from "@/lib/maintenance"

const LOCAL_AUTH_SESSION_COOKIE = "rblxdash_local_session"

const isPublicRoute = createRouteMatcher([
  "/",
  "/invite/(.*)",
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy",
  "/terms",
  "/changelog",
  "/why",
  "/contact",
  "/status",
  "/sitemap.xml",
  "/robots.txt",
  "/api/cron/(.*)",
  "/api/webhook/(.*)",
  "/api/stripe/webhook",
  "/api/v1/(.*)",
  "/api/health",
  "/api/local-auth/(.*)",
])

const isLandingOrAuthRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

const isApiV1Route = createRouteMatcher(["/api/v1/(.*)"])
const isApiRoute = createRouteMatcher(["/api/(.*)"])
const isWebhookRoute = createRouteMatcher([
  "/api/webhook/(.*)",
  "/api/stripe/webhook",
])
const isAuthRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

async function applyCommonGuards(req: NextRequest) {
  if (isMaintenanceMode()) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
    if (!isIpAllowed(ip) && req.nextUrl.pathname !== "/api/health") {
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return {
          response: getMaintenanceResponse(),
        }
      }

      return {
        response: new NextResponse(getMaintenancePageHtml(), {
          status: 503,
          headers: { "Content-Type": "text/html", "Retry-After": "300" },
        }),
      }
    }
  }

  let rateLimitResult: { remaining: number; resetAt: number } | null = null

  if (isApiV1Route(req)) {
    const key = getRateLimitKey(req, "v1")
    const rl = await checkRateLimit(key, RATE_LIMITS.api)
    if (rl.limited) {
      return { response: rl.response }
    }
    rateLimitResult = rl
  } else if (isWebhookRoute(req)) {
    const key = getRateLimitKey(req, "wh")
    const rl = await checkRateLimit(key, RATE_LIMITS.webhook)
    if (rl.limited) {
      return { response: rl.response }
    }
    rateLimitResult = rl
  } else if (isAuthRoute(req)) {
    const key = getRateLimitKey(req, "auth")
    const rl = await checkRateLimit(key, RATE_LIMITS.auth)
    if (rl.limited) {
      return { response: rl.response }
    }
  } else if (isApiRoute(req)) {
    const key = getRateLimitKey(req, "api")
    const rl = await checkRateLimit(key, RATE_LIMITS.internal)
    if (rl.limited) {
      return { response: rl.response }
    }
    rateLimitResult = rl
  }

  return {
    rateLimitResult,
  }
}

function finalizeResponse(
  response: NextResponse,
  rateLimitResult: { remaining: number; resetAt: number } | null
) {
  if (rateLimitResult) {
    return withRateLimitHeaders(response, rateLimitResult)
  }

  return response
}

async function handleSelfHostedRequest(req: NextRequest) {
  const guardResult = await applyCommonGuards(req)
  if ("response" in guardResult && guardResult.response) {
    return guardResult.response
  }

  const hasLocalSession = Boolean(
    req.cookies.get(LOCAL_AUTH_SESSION_COOKIE)?.value
  )

  if (isPublicRoute(req)) {
    if (hasLocalSession && isLandingOrAuthRoute(req)) {
      return NextResponse.redirect(toAbsoluteUrl(req, "/dashboard"))
    }

    return finalizeResponse(NextResponse.next(), guardResult.rateLimitResult)
  }

  if (!hasLocalSession) {
    if (req.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const redirectUrl = `${req.nextUrl.pathname}${req.nextUrl.search}`
    return NextResponse.redirect(
      toAbsoluteUrl(
        req,
        `/login?redirect_url=${encodeURIComponent(redirectUrl)}`
      ),
      { status: 303 }
    )
  }

  return finalizeResponse(NextResponse.next(), guardResult.rateLimitResult)
}

const hostedMiddleware = clerkMiddleware(
  async (auth, req) => {
    const guardResult = await applyCommonGuards(req)
    if ("response" in guardResult && guardResult.response) {
      return guardResult.response
    }

    if (isPublicRoute(req)) {
      const { userId } = await auth()

      if (userId && isLandingOrAuthRoute(req)) {
        return NextResponse.redirect(toAbsoluteUrl(req, "/dashboard"))
      }

      return finalizeResponse(NextResponse.next(), guardResult.rateLimitResult)
    }

    await auth.protect()

    return finalizeResponse(NextResponse.next(), guardResult.rateLimitResult)
  },
  {
    debug: process.env.NODE_ENV === "development",
  }
)

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (isSelfHostedMode()) {
    return handleSelfHostedRequest(req)
  }

  return hostedMiddleware(req, event)
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
