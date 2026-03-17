import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getGameHealth } from "@/lib/game-hub"
import { getLiveServerCutoff } from "@/lib/live-presence"

// GET /api/v1/games/:gameId/health
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
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [liveServersNow, eventsLast5m, pendingModeration, failedModeration24h, lastEvent] =
    await Promise.all([
      prisma.liveServer.count({ where: { gameId, lastHeartbeatAt: { gte: liveCutoff } } }),
      prisma.gameLog.count({ where: { gameId, createdAt: { gte: fiveMinutesAgo } } }),
      prisma.sanction.count({ where: { gameId, deliveryStatus: "PENDING", active: true } }),
      prisma.sanction.count({ where: { gameId, deliveryStatus: "FAILED", updatedAt: { gte: twentyFourHoursAgo } } }),
      prisma.gameLog.findFirst({
        where: { gameId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ])

  const health = getGameHealth({
    liveServersNow,
    eventsLast5m,
    failedModeration24h,
    pendingModeration,
    lastEventAt: lastEvent?.createdAt ?? null,
  })

  return apiSuccess({
    tone: health.tone,
    label: health.label,
    detail: health.detail,
    live_servers: liveServersNow,
    events_last_5m: eventsLast5m,
    pending_moderation: pendingModeration,
    failed_moderation_24h: failedModeration24h,
    last_event_at: lastEvent?.createdAt ?? null,
    checked_at: now,
  })
}
