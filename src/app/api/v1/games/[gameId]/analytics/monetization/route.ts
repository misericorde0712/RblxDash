import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"
import { getAnalyticsWindow, toNumber, type MonetizationRow, type MonetizationOverviewRow } from "@/lib/game-analytics"

// GET /api/v1/games/:gameId/analytics/monetization
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

  const purchaseFilter = `
    AND (
      COALESCE(payload->>'entry', '') IN ('shop_purchase', 'robux_purchase')
      OR COALESCE(payload->>'currency', '') = 'Robux'
      OR COALESCE(payload->>'purchaseType', '') <> ''
      OR COALESCE(payload->>'productId', '') <> ''
      OR COALESCE(payload->>'itemId', '') <> ''
    )
  `

  const [rows, overviewRows] = await Promise.all([
    prisma.$queryRaw<MonetizationRow[]>`
      SELECT
        COALESCE(NULLIF(payload->>'productName', ''), NULLIF(payload->>'itemName', '')) AS "productName",
        COALESCE(NULLIF(payload->>'productId', ''), NULLIF(payload->>'itemId', '')) AS "productId",
        NULLIF(payload->>'purchaseType', '') AS "purchaseType",
        COALESCE(NULLIF(payload->>'currency', ''), 'Unknown') AS currency,
        COUNT(*)::int AS transactions,
        COUNT(DISTINCT "robloxId") FILTER (WHERE "robloxId" IS NOT NULL)::int AS "uniqueBuyers",
        COALESCE(SUM(
          CASE
            WHEN COALESCE(payload->>'amount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
            THEN (payload->>'amount')::double precision
            ELSE 0
          END
        ), 0)::double precision AS gross,
        COALESCE(AVG(
          CASE
            WHEN COALESCE(payload->>'amount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
            THEN (payload->>'amount')::double precision
            ELSE NULL
          END
        ), 0)::double precision AS "avgOrderValue"
      FROM "GameLog"
      WHERE "gameId" = ${gameId}
        AND event = 'player_action'
        AND "createdAt" >= ${window.start}
        AND "createdAt" < ${window.end}
        AND COALESCE(payload->>'action', '') = 'economy'
        AND LOWER(COALESCE(payload->>'flowType', '')) = 'sink'
      GROUP BY 1, 2, 3, 4
      ORDER BY gross DESC, transactions DESC
      LIMIT 50
    `,
    prisma.$queryRaw<MonetizationOverviewRow[]>`
      SELECT
        COUNT(*)::int AS "purchaseEvents",
        COUNT(DISTINCT "robloxId") FILTER (WHERE "robloxId" IS NOT NULL)::int AS "uniqueBuyers",
        COALESCE(SUM(
          CASE
            WHEN COALESCE(payload->>'currency', '') = 'Robux'
              AND COALESCE(payload->>'amount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
            THEN (payload->>'amount')::double precision
            ELSE 0
          END
        ), 0)::double precision AS "robuxSpent",
        COALESCE(SUM(
          CASE
            WHEN COALESCE(payload->>'currency', '') <> 'Robux'
              AND COALESCE(payload->>'amount', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
            THEN (payload->>'amount')::double precision
            ELSE 0
          END
        ), 0)::double precision AS "nonRobuxSpend"
      FROM "GameLog"
      WHERE "gameId" = ${gameId}
        AND event = 'player_action'
        AND "createdAt" >= ${window.start}
        AND "createdAt" < ${window.end}
        AND COALESCE(payload->>'action', '') = 'economy'
        AND LOWER(COALESCE(payload->>'flowType', '')) = 'sink'
    `,
  ])

  const overview = overviewRows[0] ?? { purchaseEvents: 0, uniqueBuyers: 0, robuxSpent: 0, nonRobuxSpend: 0 }

  return apiSuccess({
    range: window.selectedRange,
    from: window.start,
    to: window.end,
    overview: {
      purchase_events: toNumber(overview.purchaseEvents),
      unique_buyers: toNumber(overview.uniqueBuyers),
      robux_spent: toNumber(overview.robuxSpent),
      non_robux_spend: toNumber(overview.nonRobuxSpend),
    },
    products: rows.map((r) => ({
      product_name: r.productName,
      product_id: r.productId,
      purchase_type: r.purchaseType,
      currency: r.currency,
      transactions: toNumber(r.transactions),
      unique_buyers: toNumber(r.uniqueBuyers),
      gross: toNumber(r.gross),
      avg_order_value: toNumber(r.avgOrderValue),
    })),
  })
}
