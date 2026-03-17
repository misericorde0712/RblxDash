import { describe, it, expect, beforeEach } from "vitest"
import { registerLocale, setLocale, getLocale, getAvailableLocales, t } from "../i18n"

describe("i18n", () => {
  beforeEach(() => {
    registerLocale("en", {
      "greeting": "Hello!",
      "welcome": "Welcome, {name}!",
      "count": "{n} items",
    })
    registerLocale("fr", {
      "greeting": "Bonjour !",
      "welcome": "Bienvenue, {name} !",
    })
    setLocale("en")
  })

  it("traduit une clé simple", () => {
    expect(t("greeting")).toBe("Hello!")
  })

  it("interpole les paramètres", () => {
    expect(t("welcome", { name: "Bob" })).toBe("Welcome, Bob!")
  })

  it("interpole les nombres", () => {
    expect(t("count", { n: 42 })).toBe("42 items")
  })

  it("change de locale", () => {
    setLocale("fr")
    expect(getLocale()).toBe("fr")
    expect(t("greeting")).toBe("Bonjour !")
  })

  it("fallback sur l'anglais si clé absente dans la locale", () => {
    setLocale("fr")
    // "count" n'existe pas en fr, fallback en
    expect(t("count", { n: 5 })).toBe("5 items")
  })

  it("retourne la clé si aucune traduction trouvée", () => {
    expect(t("nonexistent.key")).toBe("nonexistent.key")
  })

  it("liste les locales disponibles", () => {
    const locales = getAvailableLocales()
    expect(locales).toContain("en")
    expect(locales).toContain("fr")
  })
})
