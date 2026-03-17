import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame, getPagination } from "@/lib/api-auth"

// GET /api/v1/games/:gameId/players/:robloxId/sanctions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; robloxId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId, robloxId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const { page, limit, skip } = getPagination(req.nextUrl.searchParams)

  const [sanctions, total] = await Promise.all([
    prisma.sanction.findMany({
      where: { gameId, robloxId },
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
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.sanction.count({ where: { gameId, robloxId } }),
  ])

  return apiSuccess(
    sanctions.map((s) => ({
      id: s.id,
      type: s.type,
      reason: s.reason,
      active: s.active,
      expires_at: s.expiresAt,
      delivery_status: s.deliveryStatus,
      delivered_at: s.deliveredAt,
      delivery_details: s.deliveryDetails,
      moderator: s.moderator,
      created_at: s.createdAt,
    })),
    { page, limit, total, has_more: skip + sanctions.length < total }
  )
}
