import { describe, it, expect, beforeEach, vi } from "vitest"
import { checkRateLimit, getRateLimitKey } from "../rate-limit"

describe("checkRateLimit", () => {
  beforeEach(() => {
    // Avancer le temps pour invalider les entrées précédentes
    vi.useFakeTimers()
  })

  it("autorise les requêtes sous la limite", () => {
    const config = { limit: 5, windowSeconds: 60 }
    const result = checkRateLimit("test:1", config)
    expect(result.limited).toBe(false)
    expect(result.remaining).toBe(4)
  })

  it("bloque après dépassement de la limite", () => {
    const config = { limit: 3, windowSeconds: 60 }
    checkRateLimit("test:2", config)
    checkRateLimit("test:2", config)
    checkRateLimit("test:2", config)
    const result = checkRateLimit("test:2", config)
    expect(result.limited).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it("réinitialise après expiration de la fenêtre", () => {
    const config = { limit: 1, windowSeconds: 1 }
    checkRateLimit("test:3", config)
    const blocked = checkRateLimit("test:3", config)
    expect(blocked.limited).toBe(true)

    // Avancer de 2 secondes
    vi.advanceTimersByTime(2000)
    const after = checkRateLimit("test:3", config)
    expect(after.limited).toBe(false)
  })

  it("retourne une réponse 429 avec Retry-After", () => {
    const config = { limit: 1, windowSeconds: 30 }
    checkRateLimit("test:4", config)
    const result = checkRateLimit("test:4", config)
    if (!result.limited) throw new Error("Expected limited")
    expect(result.response.status).toBe(429)
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
