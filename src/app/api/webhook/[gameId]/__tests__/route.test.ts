import { describe, it, expect, vi, beforeEach } from "vitest"
import { createMockPrisma } from "@/lib/__tests__/helpers/mock-prisma"

const { prisma, mockTx } = createMockPrisma()

vi.mock("@/lib/prisma", () => ({ prisma }))
vi.mock("@/lib/discord", () => ({ sendModerationFailedAlert: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/live-presence", () => ({
  getServerPresenceFromPayload: vi.fn(() => ({
    jobId: "job-1",
    placeId: "place-1",
    region: "us-east",
    playerCount: 5,
    playerIds: ["123"],
  })),
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

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {}
) {
  return new Request("https://test.com/api/webhook/game-1", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  }) as unknown as import("next/server").NextRequest
}

const validBody = {
  event: "player_join",
  payload: { jobId: "job-1", placeId: "place-1", region: "us-east", playerCount: 5, playerIds: ["123"] },
  robloxId: "12345",
  username: "TestPlayer",
  displayName: "Test",
}

describe("POST /api/webhook/[gameId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 404 if game not found", async () => {
    prisma.game.findUnique.mockResolvedValue(null)
    const res = await POST(
      makeRequest(validBody, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "unknown" }) }
    )
    expect(res.status).toBe(404)
  })

  it("returns 401 if webhook secret is missing", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "correct-secret",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    const res = await POST(
      makeRequest(validBody),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("returns 401 if webhook secret does not match", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "correct-secret",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    const res = await POST(
      makeRequest(validBody, { "x-webhook-secret": "wrong-secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )
    expect(res.status).toBe(401)
  })

  it("returns 400 if body fails validation", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "secret",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    const res = await POST(
      makeRequest({ event: "" }, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )
    expect(res.status).toBe(400)
  })

  it("returns 200 and creates GameLog for valid player_join", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "secret",
      name: "TestGame",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    const res = await POST(
      makeRequest(validBody, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.ok).toBe(true)

    expect(mockTx.gameLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gameId: "game-1",
        event: "player_join",
        robloxId: "12345",
      }),
    })
  })

  it("upserts TrackedPlayer with isOnline:true on player_join", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "secret",
      name: "TestGame",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    await POST(
      makeRequest(validBody, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )

    expect(mockTx.trackedPlayer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { gameId_robloxId: { gameId: "game-1", robloxId: "12345" } },
        update: expect.objectContaining({ isOnline: true }),
        create: expect.objectContaining({ isOnline: true, robloxId: "12345" }),
      })
    )
  })

  it("sets isOnline:false on player_leave", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "secret",
      name: "TestGame",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    const leaveBody = {
      ...validBody,
      event: "player_leave",
    }

    await POST(
      makeRequest(leaveBody, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )

    expect(mockTx.trackedPlayer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ isOnline: false, currentServerJobId: null }),
      })
    )
  })

  it("deletes LiveServer on server_stopped", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "secret",
      name: "TestGame",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })

    const body = {
      event: "server_stopped",
      payload: { jobId: "job-1" },
    }

    await POST(
      makeRequest(body, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )

    expect(mockTx.liveServer.deleteMany).toHaveBeenCalledWith({
      where: { gameId: "game-1", jobId: "job-1" },
    })
  })

  it("updates sanction delivery status on moderation_applied", async () => {
    prisma.game.findUnique.mockResolvedValue({
      id: "game-1",
      webhookSecret: "secret",
      name: "TestGame",
      org: { name: "TestOrg", discordWebhookUrl: null },
    })
    mockTx.sanction.findFirst.mockResolvedValue({
      type: "BAN",
      reason: "Exploiting",
    })

    const body = {
      event: "player_action",
      payload: { action: "moderation_applied", sanctionId: "s-1", jobId: "job-1" },
      robloxId: "12345",
      username: "TestPlayer",
    }

    await POST(
      makeRequest(body, { "x-webhook-secret": "secret" }),
      { params: Promise.resolve({ gameId: "game-1" }) }
    )

    expect(mockTx.sanction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "s-1", gameId: "game-1", robloxId: "12345" },
        data: expect.objectContaining({ deliveryStatus: "APPLIED" }),
      })
    )
  })
})
