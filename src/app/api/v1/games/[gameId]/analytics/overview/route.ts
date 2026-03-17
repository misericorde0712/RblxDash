import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getAnalyticsWindow } from "@/lib/game-analytics"

// GET /api/v1/games/:gameId/analytics/overview?range=24h|7d|30d&from=YYYY-MM-DD&to=YYYY-MM-DD
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
  const window = getAnalyticsWindow({
    range: sp.get("range") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  })

  const createdAtFilter = { gte: window.start, lt: window.end }
  const prevFilter = { gte: window.previousStart, lt: window.start }

  const [totalEvents, joins, uniqueGroups, newPlayers, returningPlayers,
         prevEvents, prevJoins, prevUnique, prevNew, prevReturning,
         onlinePlayers, liveServers] = await Promise.all([
    prisma.gameLog.count({ where: { gameId, createdAt: createdAtFilter } }),
    prisma.gameLog.count({ where: { gameId, event: "player_join", createdAt: createdAtFilter } }),
    prisma.gameLog.groupBy({ by: ["robloxId"], where: { gameId, createdAt: createdAtFilter, robloxId: { not: null } } }),
    prisma.trackedPlayer.count({ where: { gameId, firstSeenAt: createdAtFilter } }),
    prisma.trackedPlayer.count({ where: { gameId, firstSeenAt: { lt: window.start }, lastSeenAt: createdAtFilter } }),
    prisma.gameLog.count({ where: { gameId, createdAt: prevFilter } }),
    prisma.gameLog.count({ where: { gameId, event: "player_join", createdAt: prevFilter } }),
    prisma.gameLog.groupBy({ by: ["robloxId"], where: { gameId, createdAt: prevFilter, robloxId: { not: null } } }),
    prisma.trackedPlayer.count({ where: { gameId, firstSeenAt: prevFilter } }),
    prisma.trackedPlayer.count({ where: { gameId, firstSeenAt: { lt: window.previousStart }, lastSeenAt: prevFilter } }),
    prisma.trackedPlayer.count({ where: { gameId, isOnline: true } }),
    prisma.liveServer.count({ where: { gameId, lastHeartbeatAt: { gte: new Date(Date.now() - 90 * 1000) } } }),
  ])

  return apiSuccess({
    range: window.selectedRange,
    from: window.start,
    to: window.end,
    current: {
      total_events: totalEvents,
      joins,
      unique_players: uniqueGroups.length,
      new_players: newPlayers,
      returning_players: returningPlayers,
    },
    previous: {
      total_events: prevEvents,
      joins: prevJoins,
      unique_players: prevUnique.length,
      new_players: prevNew,
      returning_players: prevReturning,
    },
    live: {
      players_online: onlinePlayers,
      servers: liveServers,
    },
  })
}
