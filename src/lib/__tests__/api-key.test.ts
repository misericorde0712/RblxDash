import { describe, it, expect } from "vitest"
import { hashApiKey, isValidApiKeyFormat, generateApiKey } from "../api-key"

describe("generateApiKey", () => {
  it("génère une clé avec le préfixe rd_live_", () => {
    const key = generateApiKey()
    expect(key.startsWith("rd_live_")).toBe(true)
  })

  it("génère des clés uniques", () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a).not.toBe(b)
  })
})

describe("isValidApiKeyFormat", () => {
  it("accepte une clé valide", () => {
    const key = generateApiKey()
    expect(isValidApiKeyFormat(key)).toBe(true)
  })

  it("rejette une clé sans préfixe", () => {
    expect(isValidApiKeyFormat("invalid_key_here")).toBe(false)
  })

  it("rejette une chaîne vide", () => {
    expect(isValidApiKeyFormat("")).toBe(false)
  })

  it("rejette le préfixe seul", () => {
    expect(isValidApiKeyFormat("rd_live_")).toBe(false)
  })
})

describe("hashApiKey", () => {
  it("retourne un hash déterministe", () => {
    const key = "rd_live_test123"
    expect(hashApiKey(key)).toBe(hashApiKey(key))
  })

  it("retourne des hashs différents pour des clés différentes", () => {
    expect(hashApiKey("rd_live_aaa")).not.toBe(hashApiKey("rd_live_bbb"))
  })

  it("retourne un hash hex de 64 caractères (SHA-256)", () => {
    const hash = hashApiKey("rd_live_test")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})
