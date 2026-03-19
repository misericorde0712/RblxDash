import { describe, it, expect, vi } from "vitest"

// Mock env.server pour éviter la validation Zod sans variables d'environnement
vi.mock("@/lib/env.server", () => ({
  env: {
    DATABASE_URL: "postgresql://test",
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_x",
    STRIPE_PRICE_PRO: "price_pro",
    STRIPE_PRICE_STUDIO: "price_studio",
    CLERK_SECRET_KEY: "sk_test_x",
    NODE_ENV: "test",
  },
}))

// Mock Stripe pour éviter l'erreur d'initialisation sans clé API
vi.mock("stripe", () => {
  return {
    default: class StripeMock {
      constructor() {}
    },
  }
})

// Importer après le mock
const { getPagination } = await import("../api-auth")

describe("getPagination", () => {
  it("retourne les valeurs par défaut", () => {
    const params = new URLSearchParams()
    const result = getPagination(params)
    expect(result).toEqual({ page: 1, limit: 50, skip: 0 })
  })

  it("parse page et limit depuis les params", () => {
    const params = new URLSearchParams({ page: "3", limit: "20" })
    const result = getPagination(params)
    expect(result).toEqual({ page: 3, limit: 20, skip: 40 })
  })

  it("clamp page minimum à 1", () => {
    const params = new URLSearchParams({ page: "-5" })
    const result = getPagination(params)
    expect(result.page).toBe(1)
  })

  it("clamp limit au maxLimit", () => {
    const params = new URLSearchParams({ limit: "999" })
    const result = getPagination(params, 50)
    expect(result.limit).toBe(50)
  })

  it("limit=0 tombe sur le défaut (50) car 0 est falsy", () => {
    const params = new URLSearchParams({ limit: "0" })
    const result = getPagination(params)
    expect(result.limit).toBe(50)
  })

  it("gère les valeurs non-numériques", () => {
    const params = new URLSearchParams({ page: "abc", limit: "xyz" })
    const result = getPagination(params)
    expect(result).toEqual({ page: 1, limit: 50, skip: 0 })
  })
})
