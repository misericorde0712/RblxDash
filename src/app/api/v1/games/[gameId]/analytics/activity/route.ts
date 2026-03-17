import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getAnalyticsWindow, buildTimeline, type ActivityRow } from "@/lib/game-analytics"

// GET /api/v1/games/:gameId/analytics/activity
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

  const rows = await prisma.$queryRaw<ActivityRow[]>`
    SELECT
      date_trunc(${window.bucketUnit}, "createdAt") AS bucket,
      COUNT(*)::int AS events,
      COUNT(DISTINCT "robloxId") FILTER (WHERE "robloxId" IS NOT NULL)::int AS "uniquePlayers",
      COUNT(*) FILTER (WHERE event = 'player_join')::int AS joins
    FROM "GameLog"
    WHERE "gameId" = ${gameId}
      AND "createdAt" >= ${window.start}
      AND "createdAt" < ${window.end}
    GROUP BY 1
    ORDER BY 1 ASC
  `

  const timeline = buildTimeline({
    rows,
    bucketUnit: window.bucketUnit,
    start: window.start,
    bucketCount: window.bucketCount,
  })

  return apiSuccess({
    range: window.selectedRange,
    bucket_unit: window.bucketUnit,
    from: window.start,
    to: window.end,
    buckets: timeline.map((b) => ({
      bucket_start: b.bucketStart,
      label: b.label,
      events: b.events,
      unique_players: b.uniquePlayers,
      joins: b.joins,
    })),
  })
}
