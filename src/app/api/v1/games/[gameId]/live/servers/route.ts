import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame, getPagination } from "@/lib/api-auth"
import { getLiveServerCutoff } from "@/lib/live-presence"

// GET /api/v1/games/:gameId/live/servers
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
  const liveCutoff = getLiveServerCutoff()

  const [servers, total] = await Promise.all([
    prisma.liveServer.findMany({
      where: { gameId, lastHeartbeatAt: { gte: liveCutoff } },
      select: {
        id: true,
        jobId: true,
        placeId: true,
        region: true,
        lastPlayerCount: true,
        lastPlayerIds: true,
        lastHeartbeatAt: true,
        startedAt: true,
      },
      orderBy: { lastPlayerCount: "desc" },
      skip,
      take: limit,
    }),
    prisma.liveServer.count({ where: { gameId, lastHeartbeatAt: { gte: liveCutoff } } }),
  ])

  return apiSuccess(
    servers.map((s) => ({
      id: s.id,
      job_id: s.jobId,
      place_id: s.placeId,
      region: s.region,
      player_count: s.lastPlayerCount,
      player_ids: s.lastPlayerIds,
      last_heartbeat_at: s.lastHeartbeatAt,
      started_at: s.startedAt,
    })),
    { page, limit, total, has_more: skip + servers.length < total }
  )
}
