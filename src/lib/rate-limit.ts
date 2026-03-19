import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

type RateLimitConfig = {
  /** Nombre max de requêtes dans la fenêtre */
  limit: number
  /** Durée de la fenêtre en secondes */
  windowSeconds: number
}

/** Configurations prédéfinies */
export const RATE_LIMITS = {
  /** API v1 publique : 60 req/min */
  api: { limit: 60, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Routes internes (dashboard) : 120 req/min */
  internal: { limit: 120, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Webhooks entrants : 300 req/min */
  webhook: { limit: 300, windowSeconds: 60 } satisfies RateLimitConfig,
  /** Auth / login : 10 req/min */
  auth: { limit: 10, windowSeconds: 60 } satisfies RateLimitConfig,
} as const

type RateLimitResult =
  | { limited: false; remaining: number; resetAt: number }
  | { limited: true; remaining: 0; resetAt: number; response: NextResponse }

// ─── Upstash Redis (optionnel — fallback permissif si non configuré) ────

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const limiterCache = new Map<string, Ratelimit>()

function getLimiter(config: RateLimitConfig): Ratelimit | null {
  if (!redis) return null

  const cacheKey = `${config.limit}:${config.windowSeconds}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      prefix: "rblxdash",
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Vérifie le rate limit pour une clé donnée.
 * Retourne `limited: true` avec une NextResponse 429 si la limite est atteinte.
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const limiter = getLimiter(config)

  // Fallback permissif en dev (pas d'Upstash configuré)
  if (!limiter) {
    return { limited: false, remaining: config.limit, resetAt: Date.now() + config.windowSeconds * 1000 }
  }

  const result = await limiter.limit(key)

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    return {
      limited: true,
      remaining: 0,
      resetAt: result.reset,
      response: NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please retry later." } },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(retryAfter, 1)),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
          },
        }
      ),
    }
  }

  return { limited: false, remaining: result.remaining, resetAt: result.reset }
}

/**
 * Extrait une clé d'identification depuis la requête.
 * Priorité : API key hash > Clerk userId (header) > IP.
 */
export function getRateLimitKey(
  req: Request,
  prefix: string
): string {
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    return `${prefix}:key:${auth.slice(7, 23)}`
  }

  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown"
  return `${prefix}:ip:${ip}`
}

/**
 * Helper qui ajoute les headers de rate limit à une réponse existante.
 */
export function withRateLimitHeaders(
  res: NextResponse,
  result: { remaining: number; resetAt: number }
): NextResponse {
  res.headers.set("X-RateLimit-Remaining", String(result.remaining))
  res.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt / 1000)))
  return res
}
