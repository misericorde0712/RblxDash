import { describe, it, expect, vi, beforeEach } from "vitest"
import { createLogger } from "../logger"

describe("createLogger", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "debug").mockImplementation(() => {})
  })

  it("crée un logger avec contexte", () => {
    const log = createLogger("api/games")
    expect(log.info).toBeDefined()
    expect(log.warn).toBeDefined()
    expect(log.error).toBeDefined()
    expect(log.debug).toBeDefined()
  })

  it("log.info appelle console.log avec le contexte", () => {
    const log = createLogger("test")
    log.info("hello")
    expect(console.log).toHaveBeenCalledTimes(1)
    const call = (console.log as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(call).toContain("[test]")
    expect(call).toContain("hello")
    expect(call).toContain("INFO")
  })

  it("log.warn appelle console.warn", () => {
    const log = createLogger("billing")
    log.warn("low balance", { orgId: "abc" })
    expect(console.warn).toHaveBeenCalledTimes(1)
    const call = (console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(call).toContain("WARN")
    expect(call).toContain("orgId")
  })

  it("log.error appelle console.error avec l'erreur", () => {
    const log = createLogger("webhook")
    const err = new Error("boom")
    log.error("failed", {}, err)
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it("inclut les données JSON dans le message", () => {
    const log = createLogger("api")
    log.info("created", { gameId: "g1", count: 5 })
    const calls = (console.log as ReturnType<typeof vi.fn>).mock.calls
    const lastCall = calls[calls.length - 1][0] as string
    expect(lastCall).toContain('"gameId":"g1"')
    expect(lastCall).toContain('"count":5')
  })
})
