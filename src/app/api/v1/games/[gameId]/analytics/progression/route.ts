import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getAnalyticsWindow, toNumber, type ProgressionRow } from "@/lib/game-analytics"

// GET /api/v1/games/:gameId/analytics/progression
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

  const rows = await prisma.$queryRaw<ProgressionRow[]>`
    SELECT
      COALESCE(NULLIF(payload->>'step', ''), 'unknown') AS step,
      COUNT(*)::int AS count,
      COUNT(DISTINCT "robloxId") FILTER (WHERE "robloxId" IS NOT NULL)::int AS "uniquePlayers"
    FROM "GameLog"
    WHERE "gameId" = ${gameId}
      AND event = 'player_action'
      AND "createdAt" >= ${window.start}
      AND "createdAt" < ${window.end}
      AND COALESCE(payload->>'action', '') = 'progression'
    GROUP BY 1
    ORDER BY count DESC, step ASC
    LIMIT 50
  `

  return apiSuccess({
    range: window.selectedRange,
    from: window.start,
    to: window.end,
    steps: rows.map((r) => ({
      step: r.step,
      completions: toNumber(r.count),
      unique_players: toNumber(r.uniquePlayers),
    })),
  })
}
