import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getLiveServerCutoff } from "@/lib/live-presence"
import { getGameHealth } from "@/lib/game-hub"

// GET /api/v1/games/:gameId/live
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const now = new Date()
  const liveCutoff = getLiveServerCutoff(now)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const [liveServers, onlinePlayers, pendingModeration, failedModeration24h, eventsLast5m, lastEvent] =
    await Promise.all([
      prisma.liveServer.findMany({
        where: { gameId, lastHeartbeatAt: { gte: liveCutoff } },
        select: {
          jobId: true,
          placeId: true,
          region: true,
          lastPlayerCount: true,
          lastHeartbeatAt: true,
          startedAt: true,
        },
        orderBy: { lastHeartbeatAt: "desc" },
      }),
      prisma.trackedPlayer.count({ where: { gameId, isOnline: true } }),
      prisma.sanction.count({ where: { gameId, deliveryStatus: "PENDING", active: true } }),
      prisma.sanction.count({
        where: {
          gameId,
          deliveryStatus: "FAILED",
          updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.gameLog.count({ where: { gameId, createdAt: { gte: fiveMinutesAgo } } }),
      prisma.gameLog.findFirst({
        where: { gameId },
        orderBy: { createdAt: "desc" },
        select: { event: true, createdAt: true },
      }),
    ])

  const health = getGameHealth({
    liveServersNow: liveServers.length,
    eventsLast5m,
    failedModeration24h,
    pendingModeration,
    lastEventAt: lastEvent?.createdAt ?? null,
  })

  return apiSuccess({
    health: {
      tone: health.tone,
      label: health.label,
      detail: health.detail,
    },
    live_servers_count: liveServers.length,
    players_online: onlinePlayers,
    events_last_5m: eventsLast5m,
    pending_moderation: pendingModeration,
    failed_moderation_24h: failedModeration24h,
    last_event_at: lastEvent?.createdAt ?? null,
    servers: liveServers.map((s) => ({
      job_id: s.jobId,
      place_id: s.placeId,
      region: s.region,
      player_count: s.lastPlayerCount,
      last_heartbeat_at: s.lastHeartbeatAt,
      started_at: s.startedAt,
    })),
  })
}
