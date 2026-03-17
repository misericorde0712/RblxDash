import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getAnalyticsWindow, toNumber, type EconomyRow } from "@/lib/game-analytics"

// GET /api/v1/games/:gameId/analytics/economy
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

  const rows = await prisma.$queryRaw<EconomyRow[]>`
    SELECT
      COALESCE(NULLIF(payload->>'currency', ''), 'Unknown') AS currency,
      COUNT(*)::int AS events,
      COALESCE(SUM(
        CASE
          WHEN LOWER(COALESCE(payload->>'flowType', '')) = 'source'
            AND COALESCE(payload->>'amount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
          THEN (payload->>'amount')::double precision
          ELSE 0
        END
      ), 0)::double precision AS sources,
      COALESCE(SUM(
        CASE
          WHEN LOWER(COALESCE(payload->>'flowType', '')) = 'sink'
            AND COALESCE(payload->>'amount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
          THEN (payload->>'amount')::double precision
          ELSE 0
        END
      ), 0)::double precision AS sinks
    FROM "GameLog"
    WHERE "gameId" = ${gameId}
      AND event = 'player_action'
      AND "createdAt" >= ${window.start}
      AND "createdAt" < ${window.end}
      AND COALESCE(payload->>'action', '') = 'economy'
    GROUP BY 1
    ORDER BY events DESC, currency ASC
  `

  return apiSuccess({
    range: window.selectedRange,
    from: window.start,
    to: window.end,
    currencies: rows.map((r) => ({
      currency: r.currency,
      events: toNumber(r.events),
      sources_total: toNumber(r.sources),
      sinks_total: toNumber(r.sinks),
      net: toNumber(r.sources) - toNumber(r.sinks),
    })),
  })
}
