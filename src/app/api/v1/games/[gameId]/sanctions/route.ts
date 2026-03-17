import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, apiCreated, resolveGame, getPagination } from "@/lib/api-auth"
import { getSanctionExpiresAt } from "@/lib/player-moderation"

const CreateSanctionSchema = z.object({
  roblox_id: z.string().min(1),
  type: z.enum(["KICK", "TIMEOUT", "BAN", "UNBAN"]),
  reason: z.string().min(1).max(500),
  duration_minutes: z.number().int().positive().optional().nullable(),
})

// GET /api/v1/games/:gameId/sanctions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = getPagination(sp)
  const status = sp.get("status") ?? "active"
  const type = sp.get("type")?.toUpperCase() as "BAN" | "KICK" | "TIMEOUT" | "UNBAN" | null

  const where = {
    gameId,
    ...(status === "active" ? { active: true } : {}),
    ...(type && ["BAN", "KICK", "TIMEOUT", "UNBAN"].includes(type) ? { type } : {}),
  }

  const [sanctions, total] = await Promise.all([
    prisma.sanction.findMany({
      where,
      select: {
        id: true,
        type: true,
        reason: true,
        active: true,
        expiresAt: true,
        deliveryStatus: true,
        deliveredAt: true,
        deliveryDetails: true,
        moderator: true,
        robloxId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sanction.count({ where }),
  ])

  return apiSuccess(
    sanctions.map((s) => ({
      id: s.id,
      type: s.type,
      reason: s.reason,
      active: s.active,
      roblox_id: s.robloxId,
      expires_at: s.expiresAt,
      delivery_status: s.deliveryStatus,
      delivered_at: s.deliveredAt,
      delivery_details: s.deliveryDetails,
      moderator: s.moderator,
      created_at: s.createdAt,
      updated_at: s.updatedAt,
    })),
    { page, limit, total, has_more: skip + sanctions.length < total }
  )
}

// POST /api/v1/games/:gameId/sanctions
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const body = await req.json().catch(() => ({}))
  const parsed = CreateSanctionSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid input.", 400)
  }

  const { roblox_id, type, reason, duration_minutes } = parsed.data

  // S'assurer que le joueur est tracké (upsert minimal)
  await prisma.trackedPlayer.upsert({
    where: { gameId_robloxId: { gameId, robloxId: roblox_id } },
    update: {},
    create: { gameId, robloxId: roblox_id },
  })

  const expiresAt = getSanctionExpiresAt({
    type,
    durationMinutes: duration_minutes ?? undefined,
  })

  const sanction = await prisma.sanction.create({
    data: {
      gameId,
      robloxId: roblox_id,
      type,
      reason,
      expiresAt,
      moderator: `api:${auth.apiKey.name}`,
      deliveryStatus: "PENDING",
    },
  })

  return apiCreated({
    id: sanction.id,
    type: sanction.type,
    reason: sanction.reason,
    roblox_id: sanction.robloxId,
    active: sanction.active,
    expires_at: sanction.expiresAt,
    delivery_status: sanction.deliveryStatus,
    moderator: sanction.moderator,
    created_at: sanction.createdAt,
  })
}
