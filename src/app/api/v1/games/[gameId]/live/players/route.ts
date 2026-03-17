import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame, getPagination } from "@/lib/api-auth"

// GET /api/v1/games/:gameId/live/players
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const { page, limit, skip } = getPagination(req.nextUrl.searchParams)

  const [players, total] = await Promise.all([
    prisma.trackedPlayer.findMany({
      where: { gameId, isOnline: true },
      select: {
        robloxId: true,
        username: true,
        displayName: true,
        currentServerJobId: true,
        lastSessionStartedAt: true,
      },
      orderBy: { lastSessionStartedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.trackedPlayer.count({ where: { gameId, isOnline: true } }),
  ])

  return apiSuccess(
    players.map((p) => ({
      roblox_id: p.robloxId,
      username: p.username,
      display_name: p.displayName,
      server_job_id: p.currentServerJobId,
      session_started_at: p.lastSessionStartedAt,
    })),
    { page, limit, total, has_more: skip + players.length < total }
  )
}
