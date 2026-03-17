import { describe, it, expect, beforeEach, vi } from "vitest"

describe("maintenance mode", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it("est désactivé par défaut", async () => {
    const { isMaintenanceMode } = await import("../maintenance")
    expect(isMaintenanceMode()).toBe(false)
  })

  it("s'active avec MAINTENANCE_MODE=true", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true")
    // Re-import pour prendre en compte l'env
    const { isMaintenanceMode } = await import("../maintenance")
    expect(isMaintenanceMode()).toBe(true)
  })

  it("isIpAllowed retourne false sans config", async () => {
    const { isIpAllowed } = await import("../maintenance")
    expect(isIpAllowed("1.2.3.4")).toBe(false)
    expect(isIpAllowed(null)).toBe(false)
  })

  it("isIpAllowed autorise les IPs configurées", async () => {
    vi.stubEnv("MAINTENANCE_ALLOWED_IPS", "1.2.3.4, 5.6.7.8")
    const { isIpAllowed } = await import("../maintenance")
    expect(isIpAllowed("1.2.3.4")).toBe(true)
    expect(isIpAllowed("5.6.7.8")).toBe(true)
    expect(isIpAllowed("9.9.9.9")).toBe(false)
  })

  it("getMaintenanceResponse retourne un 503 JSON", async () => {
    const { getMaintenanceResponse } = await import("../maintenance")
    const res = getMaintenanceResponse()
    expect(res.status).toBe(503)
    expect(res.headers.get("Retry-After")).toBe("300")
  })

  it("getMaintenancePageHtml retourne du HTML", async () => {
    const { getMaintenancePageHtml } = await import("../maintenance")
    const html = getMaintenancePageHtml()
    expect(html).toContain("<!DOCTYPE html>")
    expect(html).toContain("Maintenance")
  })

  it("utilise le message custom si configuré", async () => {
    vi.stubEnv("MAINTENANCE_MESSAGE", "Custom message here")
    const { getMaintenancePageHtml } = await import("../maintenance")
    const html = getMaintenancePageHtml()
    expect(html).toContain("Custom message here")
  })
})
