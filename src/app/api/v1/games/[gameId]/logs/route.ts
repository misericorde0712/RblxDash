import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame, getPagination } from "@/lib/api-auth"
import { PLANS } from "@/lib/stripe"

// GET /api/v1/games/:gameId/logs
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
  const { page, limit, skip } = getPagination(sp, 200)

  // Rétention selon plan (STUDIO = 90j)
  const retentionDays = PLANS.STUDIO.logRetentionDays
  const retentionCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  const eventFilter = sp.get("event")?.trim() || null
  const robloxIdFilter = sp.get("roblox_id")?.trim() || null
  const from = sp.get("from") ? new Date(sp.get("from")!) : null
  const to = sp.get("to") ? new Date(sp.get("to")!) : null

  const where = {
    gameId,
    createdAt: {
      gte: from && from > retentionCutoff ? from : retentionCutoff,
      ...(to ? { lte: to } : {}),
    },
    ...(eventFilter ? { event: eventFilter } : {}),
    ...(robloxIdFilter ? { robloxId: robloxIdFilter } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.gameLog.findMany({
      where,
      select: {
        id: true,
        event: true,
        payload: true,
        robloxId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.gameLog.count({ where }),
  ])

  return apiSuccess(
    logs.map((l) => ({
      id: l.id,
      event: l.event,
      payload: l.payload,
      roblox_id: l.robloxId,
      created_at: l.createdAt,
    })),
    { page, limit, total, has_more: skip + logs.length < total }
  )
}
