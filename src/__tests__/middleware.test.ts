import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock all middleware dependencies
const mockCheckRateLimit = vi.fn().mockResolvedValue({ limited: false, remaining: 100, resetAt: Date.now() + 60000 })
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getRateLimitKey: vi.fn((_req: unknown, prefix: string) => `${prefix}:ip:127.0.0.1`),
  RATE_LIMITS: {
    api: { limit: 60, windowSeconds: 60 },
    internal: { limit: 120, windowSeconds: 60 },
    webhook: { limit: 300, windowSeconds: 60 },
    auth: { limit: 10, windowSeconds: 60 },
  },
}))

const mockIsMaintenanceMode = vi.fn().mockReturnValue(false)
const mockIsIpAllowed = vi.fn().mockReturnValue(false)
vi.mock("@/lib/maintenance", () => ({
  isMaintenanceMode: () => mockIsMaintenanceMode(),
  isIpAllowed: (ip: string) => mockIsIpAllowed(ip),
  getMaintenanceResponse: () =>
    new Response(JSON.stringify({ error: { code: "MAINTENANCE" } }), { status: 503 }),
  getMaintenancePageHtml: () => "<html>Maintenance</html>",
}))

vi.mock("@/lib/request-url", () => ({
  toAbsoluteUrl: (_req: unknown, path: string) => new URL(path, "https://test.com"),
}))

// Mock Clerk — capture the middleware callback so we can invoke it
let capturedCallback: ((auth: unknown, req: unknown) => Promise<unknown>) | null = null
const mockProtect = vi.fn()

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (cb: (auth: unknown, req: unknown) => Promise<unknown>) => {
    capturedCallback = cb
    return async (req: Request) => {
      const authFn = Object.assign(
        () => Promise.resolve({ userId: null }),
        { protect: mockProtect }
      )
      return capturedCallback!(authFn, req)
    }
  },
  createRouteMatcher: (patterns: string[]) => {
    return (req: { nextUrl: { pathname: string } }) => {
      return patterns.some((pattern) => {
        const regex = new RegExp("^" + pattern.replace("(.*)", ".*") + "$")
        return regex.test(req.nextUrl.pathname)
      })
    }
  },
}))

// We need to import the middleware after all mocks are set up
const middleware = (await import("../middleware")).default

function makeMiddlewareRequest(pathname: string) {
  const url = `https://test.com${pathname}`
  const req = new Request(url)
  // Add nextUrl property like NextRequest
  Object.defineProperty(req, "nextUrl", {
    value: new URL(url),
    writable: false,
  })
  return req
}

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsMaintenanceMode.mockReturnValue(false)
    mockCheckRateLimit.mockResolvedValue({ limited: false, remaining: 100, resetAt: Date.now() })
  })

  it("returns 503 for non-API routes during maintenance", async () => {
    mockIsMaintenanceMode.mockReturnValue(true)

    const res = await middleware(makeMiddlewareRequest("/dashboard"))
    expect(res.status).toBe(503)
  })

  it("returns 503 JSON for API routes during maintenance", async () => {
    mockIsMaintenanceMode.mockReturnValue(true)

    const res = await middleware(makeMiddlewareRequest("/api/games"))
    expect(res.status).toBe(503)
  })

  it("bypasses maintenance for allowed IPs", async () => {
    mockIsMaintenanceMode.mockReturnValue(true)
    mockIsIpAllowed.mockReturnValue(true)

    const res = await middleware(makeMiddlewareRequest("/dashboard"))
    // Should not be 503
    expect(res.status).not.toBe(503)
  })

  it("returns 429 when rate limited on API v1", async () => {
    mockCheckRateLimit.mockResolvedValue({
      limited: true,
      remaining: 0,
      resetAt: Date.now() + 60000,
      response: new Response(
        JSON.stringify({ error: { code: "RATE_LIMITED" } }),
        { status: 429 }
      ),
    })

    const res = await middleware(makeMiddlewareRequest("/api/v1/games"))
    expect(res.status).toBe(429)
  })

  it("allows public routes without auth", async () => {
    const res = await middleware(makeMiddlewareRequest("/changelog"))
    // Public routes should pass through (200 or redirect)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
  })
})
