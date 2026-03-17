import { NextResponse } from "next/server"

type RateLimitEntry = {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Nettoyage périodique des entrées expirées (toutes les 60s)
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key)
  }
}

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

/**
 * Vérifie le rate limit pour une clé donnée.
 * Retourne `limited: true` avec une NextResponse 429 si la limite est atteinte.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowSeconds * 1000 })
    return { limited: false, remaining: config.limit - 1, resetAt: now + config.windowSeconds * 1000 }
  }

  entry.count++

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return {
      limited: true,
      remaining: 0,
      resetAt: entry.resetAt,
      response: NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Too many requests. Please retry later." } },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(entry.resetAt / 1000)),
          },
        }
      ),
    }
  }

  return { limited: false, remaining: config.limit - entry.count, resetAt: entry.resetAt }
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
