import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMockPrisma } from "@/lib/__tests__/helpers/mock-prisma"

const { prisma, mockTx } = createMockPrisma()

const mockGetCurrentOrgForApi = vi.fn()

vi.mock("@/lib/auth", () => ({ getCurrentOrgForApi: (...args: unknown[]) => mockGetCurrentOrgForApi(...args) }))
vi.mock("@/lib/prisma", () => ({ prisma }))
vi.mock("@/lib/audit-log", () => ({ createAuditLog: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/roblox-connection", () => ({ ensureRobloxAccessToken: vi.fn().mockResolvedValue(null) }))
vi.mock("@/lib/roblox-open-cloud", () => ({
  writeDataStoreBan: vi.fn().mockResolvedValue(undefined),
  deleteDataStoreBan: vi.fn().mockResolvedValue(undefined),
}))
vi.mock("@/lib/player-moderation", () => ({
  formatSanctionType: vi.fn((t: string) => t),
  getSanctionExpiresAt: vi.fn(() => null),
}))
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
vi.mock("stripe", () => ({ default: class Stripe {} }))

const { POST } = await import("../route")

const fakeContext = {
  context: {
    dbUser: { id: "user-1", name: "Moderator", email: "mod@test.com" },
    org: { id: "org-1", name: "TestOrg" },
    currentGame: { id: "game-1", name: "TestGame" },
  },
}

function makeRequest(body: unknown) {
  return new Request("https://test.com/api/players/12345/sanctions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest
}

describe("POST /api/players/[robloxId]/sanctions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCurrentOrgForApi.mockResolvedValue(fakeContext)
    prisma.trackedPlayer.findUnique.mockResolvedValue({
      robloxId: "12345",
      username: "TestPlayer",
      displayName: "Test",
    })
    prisma.game.findUnique.mockResolvedValue({
      robloxUniverseId: null,
      robloxConnection: null,
    })
  })

  it("returns auth response if not authenticated", async () => {
    const authResponse = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    mockGetCurrentOrgForApi.mockResolvedValue({ response: authResponse })

    const res = await POST(
      makeRequest({ type: "BAN", reason: "Exploiting in game" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(401)
  })

  it("returns 409 if no game is selected", async () => {
    mockGetCurrentOrgForApi.mockResolvedValue({
      context: { ...fakeContext.context, currentGame: null },
    })

    const res = await POST(
      makeRequest({ type: "BAN", reason: "Exploiting in game" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(409)
  })

  it("returns 400 if body fails Zod validation", async () => {
    const res = await POST(
      makeRequest({ type: "BAN", reason: "Hi" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 if type is invalid", async () => {
    const res = await POST(
      makeRequest({ type: "INVALID", reason: "Exploiting in game" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(400)
  })

  it("returns 404 if player not found", async () => {
    prisma.trackedPlayer.findUnique.mockResolvedValue(null)

    const res = await POST(
      makeRequest({ type: "BAN", reason: "Exploiting in game" }),
      { params: Promise.resolve({ robloxId: "99999" }) }
    )
    expect(res.status).toBe(404)
  })

  it("creates a BAN sanction successfully", async () => {
    const res = await POST(
      makeRequest({ type: "BAN", reason: "Exploiting in game" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.sanction).toBeDefined()
    expect(json.sanction.type).toBe("BAN")

    // Deactivates existing restrictions
    expect(mockTx.sanction.updateMany).toHaveBeenCalled()
    // Creates new sanction
    expect(mockTx.sanction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameId: "game-1",
        robloxId: "12345",
        type: "BAN",
        active: true,
      }),
    })
  })

  it("returns 409 for UNBAN if no active restriction", async () => {
    mockTx.sanction.findMany.mockResolvedValue([])

    const res = await POST(
      makeRequest({ type: "UNBAN", reason: "Appeal accepted by admin" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(409)
  })

  it("creates UNBAN when active restriction exists", async () => {
    mockTx.sanction.findMany.mockResolvedValue([{ id: "s-old" }])

    const res = await POST(
      makeRequest({ type: "UNBAN", reason: "Appeal accepted by admin" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(200)

    expect(mockTx.sanction.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s-old"] } },
      data: { active: false },
    })
    expect(mockTx.sanction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "UNBAN",
        active: false,
      }),
    })
  })

  it("returns 400 for TIMEOUT without durationMinutes", async () => {
    const res = await POST(
      makeRequest({ type: "TIMEOUT", reason: "Being disruptive in chat" }),
      { params: Promise.resolve({ robloxId: "12345" }) }
    )
    expect(res.status).toBe(400)
  })
})
