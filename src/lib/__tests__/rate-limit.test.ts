import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock Upstash — no Redis in tests
vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")

const { checkRateLimit, getRateLimitKey } = await import("../rate-limit")

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("autorise toutes les requêtes sans Upstash (fallback dev)", async () => {
    const config = { limit: 5, windowSeconds: 60 }
    const result = await checkRateLimit("test:1", config)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(5)
  })

  it("retourne le bon format en mode fallback", async () => {
    const config = { limit: 10, windowSeconds: 30 }
    const result = await checkRateLimit("test:2", config)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(10)
    expect(result.resetAt).toBeGreaterThan(Date.now())
  })
})

describe("getRateLimitKey", () => {
  it("utilise le préfixe de clé API si présent", () => {
    const req = new Request("https://example.com", {
      headers: { authorization: "Bearer rd_live_abc123xyz" },
    })
    const key = getRateLimitKey(req, "api")
    expect(key).toBe("api:key:rd_live_abc123xy")
  })

  it("utilise l'IP en fallback", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    const key = getRateLimitKey(req, "api")
    expect(key).toBe("api:ip:1.2.3.4")
  })

  it("retourne unknown si pas d'IP", () => {
    const req = new Request("https://example.com")
    const key = getRateLimitKey(req, "web")
    expect(key).toBe("web:ip:unknown")
  })
})
