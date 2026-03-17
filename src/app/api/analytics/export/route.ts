import { NextRequest, NextResponse } from "next/server"
import { getCurrentOrgForRoute } from "@/lib/auth"
import {
  buildTimeline,
  getAnalyticsWindow,
  getAnalyticsDataset,
} from "@/lib/game-analytics"
import { prisma } from "@/lib/prisma"

function csvEscape(value: string | number | bigint | null | undefined) {
  const normalized =
    value === null || value === undefined ? "" : String(value)

  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replace(/"/g, "\"\"")}"`
  }

  return normalized
}

function getSafeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "analytics"
}

export async function GET(req: NextRequest) {
  try {
    const currentOrgResult = await getCurrentOrgForRoute(req)

    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { currentGame } = currentOrgResult.context

    if (!currentGame) {
      return NextResponse.json(
        { error: "Select a game before exporting analytics." },
        { status: 409 }
      )
    }

    const kind = req.nextUrl.searchParams.get("kind") === "monetization"
      ? "monetization"
      : "overview"
    const window = getAnalyticsWindow({
      range: req.nextUrl.searchParams.get("range") ?? undefined,
      from: req.nextUrl.searchParams.get("from") ?? undefined,
      to: req.nextUrl.searchParams.get("to") ?? undefined,
    })
    const dataset = await getAnalyticsDataset(prisma, {
      gameId: currentGame.id,
      window,
    })

    let csv = ""
    let suffix = "overview"

    if (kind === "monetization") {
      suffix = "monetization"
      csv = [
        [
          "product",
          "product_id",
          "purchase_type",
          "entry",
          "currency",
          "transactions",
          "unique_buyers",
          "gross",
          "avg_order_value",
        ].join(","),
        ...dataset.monetizationRows.map((row) =>
          [
            row.productName ?? "",
            row.productId ?? row.itemId ?? "",
            row.purchaseType ?? "",
            row.entry ?? "",
            row.currency ?? "",
            row.transactions,
            row.uniqueBuyers,
            row.gross,
            row.avgOrderValue,
          ]
            .map(csvEscape)
            .join(",")
        ),
      ].join("\n")
    } else {
      const timeline = buildTimeline({
        rows: dataset.activityRows,
        bucketUnit: window.bucketUnit,
        start: window.start,
        bucketCount: window.bucketCount,
      })
      csv = [
        ["bucket_start", "bucket_label", "events", "joins", "active_players"].join(","),
        ...timeline.map((row) =>
          [
            row.bucketStart.toISOString(),
            row.label,
            row.events,
            row.joins,
            row.uniquePlayers,
          ]
            .map(csvEscape)
            .join(",")
        ),
      ].join("\n")
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${getSafeFileName(
          currentGame.name
        )}-${suffix}.csv\"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("[GET /api/analytics/export]", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"
