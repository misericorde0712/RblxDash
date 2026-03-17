import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { toAbsoluteUrl } from "@/lib/request-url"
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from "@/lib/rate-limit"
import { isMaintenanceMode, isIpAllowed, getMaintenanceResponse, getMaintenancePageHtml } from "@/lib/maintenance"

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
  "/api/webhook/(.*)",
  "/api/stripe/webhook",
  "/api/health",
])

const isLandingOrAuthRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
])

const isApiV1Route = createRouteMatcher(["/api/v1/(.*)"])
const isApiRoute = createRouteMatcher(["/api/(.*)"])
const isWebhookRoute = createRouteMatcher(["/api/webhook/(.*)", "/api/stripe/webhook"])
const isAuthRoute = createRouteMatcher(["/login(.*)", "/register(.*)", "/sign-in(.*)", "/sign-up(.*)"])

export default clerkMiddleware(
  async (auth, req) => {
    // ─── Maintenance mode ─────────────────────────────────────
    if (isMaintenanceMode()) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
      // Bypass pour les IPs autorisées et le health check
      if (!isIpAllowed(ip) && req.nextUrl.pathname !== "/api/health") {
        if (req.nextUrl.pathname.startsWith("/api/")) {
          return getMaintenanceResponse()
        }
        return new NextResponse(getMaintenancePageHtml(), {
          status: 503,
          headers: { "Content-Type": "text/html", "Retry-After": "300" },
        })
      }
    }

    // ─── Rate limiting ────────────────────────────────────────
    const { pathname } = req.nextUrl

    if (isApiV1Route(req)) {
      const key = getRateLimitKey(req, "v1")
      const rl = checkRateLimit(key, RATE_LIMITS.api)
      if (rl.limited) return rl.response
    } else if (isWebhookRoute(req)) {
      const key = getRateLimitKey(req, "wh")
      const rl = checkRateLimit(key, RATE_LIMITS.webhook)
      if (rl.limited) return rl.response
    } else if (isAuthRoute(req)) {
      const key = getRateLimitKey(req, "auth")
      const rl = checkRateLimit(key, RATE_LIMITS.auth)
      if (rl.limited) return rl.response
    } else if (isApiRoute(req)) {
      const key = getRateLimitKey(req, "api")
      const rl = checkRateLimit(key, RATE_LIMITS.internal)
      if (rl.limited) return rl.response
    }

    // ─── Routing ──────────────────────────────────────────────
    if (isPublicRoute(req)) {
      const { userId } = await auth()

      if (userId && isLandingOrAuthRoute(req)) {
        return NextResponse.redirect(toAbsoluteUrl(req, "/dashboard"))
      }

      return NextResponse.next()
    }

    await auth.protect()

    return NextResponse.next()
  },
  {
    debug: process.env.NODE_ENV === "development",
  }
)

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
