import type { PrismaClient } from "@prisma/client"
import { getLiveServerCutoff } from "@/lib/live-presence"

export type AnalyticsRange = "24h" | "7d" | "30d" | "custom"
export type BucketUnit = "hour" | "day"

type SearchValue = string | string[] | undefined

export type ActivityRow = {
  bucket: Date | string
  events: number | bigint | string
  uniquePlayers: number | bigint | string
  joins: number | bigint | string
}

export type CustomActionRow = {
  action: string | null
  count: number | bigint | string
  uniquePlayers: number | bigint | string
}

export type EconomyRow = {
  currency: string | null
  events: number | bigint | string
  sources: number | string
  sinks: number | string
}

export type ProgressionRow = {
  step: string | null
  count: number | bigint | string
  uniquePlayers: number | bigint | string
}

export type MonetizationRow = {
  productName: string | null
  productId: string | null
  itemId: string | null
  purchaseType: string | null
  entry: string | null
  currency: string | null
  transactions: number | bigint | string
  uniqueBuyers: number | bigint | string
  gross: number | string
  avgOrderValue: number | string
}

export type MonetizationOverviewRow = {
  purchaseEvents: number | bigint | string
  uniqueBuyers: number | bigint | string
  robuxSpent: number | string
  nonRobuxSpend: number | string
}

export type AnalyticsWindow = {
  selectedRange: AnalyticsRange
  start: Date
  end: Date
  previousStart: Date
  bucketUnit: BucketUnit
  bucketCount: number
  fromInput: string
  toInput: string
}

export type OverviewWindowStats = {
  totalEvents: number
  joins: number
  uniquePlayers: number
  newPlayers: number
  returningPlayers: number
  averageSessionSeconds: number
}

export type AnalyticsDataset = {
  currentOverview: OverviewWindowStats
  previousOverview: OverviewWindowStats
  currentOnlinePlayers: number
  liveServersNow: number
  activityRows: ActivityRow[]
  topCustomActionRows: CustomActionRow[]
  economyRows: EconomyRow[]
  progressionRows: ProgressionRow[]
  monetizationRows: MonetizationRow[]
  monetizationOverview: {
    purchaseEvents: number
    uniqueBuyers: number
    robuxSpent: number
    nonRobuxSpend: number
  }
  dau: number
  mau: number
  platformMix: { label: string; value: number }[]
  topErrors: { label: string; value: number }[]
}

export function getSearchValue(value: SearchValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

export function getAnalyticsRange(value: string): AnalyticsRange {
  if (value === "24h" || value === "30d" || value === "custom") {
    return value
  }

  return "7d"
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function formatDateInputValue(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function addHours(value: Date, hours: number) {
  const next = new Date(value)
  next.setHours(next.getHours() + hours)
  return next
}

function getCustomWindow(from: Date, to: Date): AnalyticsWindow {
  const start = from <= to ? from : to
  const orderedTo = to >= from ? to : from
  const endExclusive = addDays(orderedTo, 1)
  const durationMs = Math.max(endExclusive.getTime() - start.getTime(), 60 * 60 * 1000)
  const bucketUnit: BucketUnit = durationMs <= 48 * 60 * 60 * 1000 ? "hour" : "day"
  const bucketCount =
    bucketUnit === "hour"
      ? Math.max(1, Math.ceil(durationMs / (60 * 60 * 1000)))
      : Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)))

  return {
    selectedRange: "custom",
    start,
    end: endExclusive,
    previousStart: new Date(start.getTime() - durationMs),
    bucketUnit,
    bucketCount,
    fromInput: formatDateInputValue(start),
    toInput: formatDateInputValue(orderedTo),
  }
}

export function getAnalyticsWindow(
  searchParams: Record<string, SearchValue>,
  referenceDate = new Date()
): AnalyticsWindow {
  const selectedRange = getAnalyticsRange(getSearchValue(searchParams.range))
  const fromInput = getSearchValue(searchParams.from)
  const toInput = getSearchValue(searchParams.to)
  const parsedFrom = parseDateInput(fromInput)
  const parsedTo = parseDateInput(toInput)

  if (parsedFrom && parsedTo) {
    return getCustomWindow(parsedFrom, parsedTo)
  }

  if (selectedRange === "24h") {
    const start = new Date(referenceDate)
    start.setMinutes(0, 0, 0)
    start.setHours(start.getHours() - 23)

    return {
      selectedRange,
      start,
      end: referenceDate,
      previousStart: addHours(start, -24),
      bucketUnit: "hour",
      bucketCount: 24,
      fromInput: formatDateInputValue(start),
      toInput: formatDateInputValue(referenceDate),
    }
  }

  const days = selectedRange === "30d" ? 30 : 7
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))

  return {
    selectedRange,
    start,
    end: referenceDate,
    previousStart: addDays(start, -days),
    bucketUnit: "day",
    bucketCount: days,
    fromInput: formatDateInputValue(start),
    toInput: formatDateInputValue(referenceDate),
  }
}

export function getBucketKey(value: Date, bucketUnit: BucketUnit) {
  if (bucketUnit === "hour") {
    return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}-${value.getHours()}`
  }

  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`
}

export function addBucket(value: Date, bucketUnit: BucketUnit) {
  return bucketUnit === "hour" ? addHours(value, 1) : addDays(value, 1)
}

export function formatBucketLabel(value: Date, bucketUnit: BucketUnit) {
  if (bucketUnit === "hour") {
    return value.toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    })
  }

  return value.toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  })
}

export function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value
  }

  if (typeof value === "bigint") {
    return Number(value)
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function buildTimeline(params: {
  rows: ActivityRow[]
  bucketUnit: BucketUnit
  start: Date
  bucketCount: number
}) {
  const rowByKey = new Map(
    params.rows.map((row) => {
      const bucketDate = new Date(row.bucket)

      return [
        getBucketKey(bucketDate, params.bucketUnit),
        {
          bucket: bucketDate,
          events: toNumber(row.events),
          uniquePlayers: toNumber(row.uniquePlayers),
          joins: toNumber(row.joins),
        },
      ]
    })
  )

  const buckets = []
  let cursor = new Date(params.start)

  for (let index = 0; index < params.bucketCount; index += 1) {
    const key = getBucketKey(cursor, params.bucketUnit)
    const existing = rowByKey.get(key)

    buckets.push({
      key,
      bucketStart: new Date(cursor),
      label: formatBucketLabel(cursor, params.bucketUnit),
      events: existing?.events ?? 0,
      uniquePlayers: existing?.uniquePlayers ?? 0,
      joins: existing?.joins ?? 0,
    })

    cursor = addBucket(cursor, params.bucketUnit)
  }

  return buckets
}

async function getOverviewForWindow(prisma: PrismaClient, params: {
  gameId: string
  start: Date
  end: Date
}) {
  const createdAtFilter = {
    gte: params.start,
    lt: params.end,
  }

  const [totalEvents, joins, uniquePlayersGroups, newPlayers, returningPlayers, sessionStats] =
    await Promise.all([
      prisma.gameLog.count({
        where: {
          gameId: params.gameId,
          createdAt: createdAtFilter,
        },
      }),
      prisma.gameLog.count({
        where: {
          gameId: params.gameId,
          event: "player_join",
          createdAt: createdAtFilter,
        },
      }),
      prisma.gameLog.groupBy({
        by: ["robloxId"],
        where: {
          gameId: params.gameId,
          createdAt: createdAtFilter,
          robloxId: {
            not: null,
          },
        },
      }),
      prisma.trackedPlayer.count({
        where: {
          gameId: params.gameId,
          firstSeenAt: createdAtFilter,
        },
      }),
      prisma.trackedPlayer.count({
        where: {
          gameId: params.gameId,
          firstSeenAt: {
            lt: params.start,
          },
          lastSeenAt: createdAtFilter,
        },
      }),
      prisma.$queryRaw<{ avgSessionSeconds: number | null }[]>`
        SELECT COALESCE(AVG(EXTRACT(EPOCH FROM ("lastSessionEndedAt" - "lastSessionStartedAt"))), 0)::int AS "avgSessionSeconds"
        FROM "TrackedPlayer"
        WHERE "gameId" = ${params.gameId}
          AND "lastSessionEndedAt" IS NOT NULL
          AND "lastSessionStartedAt" IS NOT NULL
          AND "lastSessionEndedAt" >= "lastSessionStartedAt"
          AND "lastSessionEndedAt" >= ${params.start}
          AND "lastSessionEndedAt" < ${params.end}
      `,
    ])

  return {
    totalEvents,
    joins,
    uniquePlayers: uniquePlayersGroups.length,
    newPlayers,
    returningPlayers,
    averageSessionSeconds: sessionStats[0]?.avgSessionSeconds ? toNumber(sessionStats[0].avgSessionSeconds) : 0,
  }
}

export async function getAnalyticsDataset(
  prisma: PrismaClient,
  params: {
    gameId: string
    window: AnalyticsWindow
  }
): Promise<AnalyticsDataset> {
  const { gameId, window } = params
  const liveCutoff = getLiveServerCutoff()

  const [
    currentOverview,
    previousOverview,
    currentOnlinePlayers,
    liveServersNow,
    activityRows,
    topCustomActionRows,
    economyRows,
    progressionRows,
    monetizationRows,
    monetizationOverviewRows,
    dauCount,
    mauCount,
    platformMixRows,
    topErrorsRows,
  ] = await Promise.all([
    getOverviewForWindow(prisma, {
      gameId,
      start: window.start,
      end: window.end,
    }),
    getOverviewForWindow(prisma, {
      gameId,
      start: window.previousStart,
      end: window.start,
    }),
    prisma.trackedPlayer.count({
      where: {
        gameId,
        isOnline: true,
      },
    }),
    prisma.liveServer.count({
      where: {
        gameId,
        lastHeartbeatAt: {
          gte: liveCutoff,
        },
      },
    }),
    prisma.$queryRaw<ActivityRow[]>`
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
    `,
    prisma.$queryRaw<CustomActionRow[]>`
      SELECT
        NULLIF(payload->>'action', '') AS action,
        COUNT(*)::int AS count,
        COUNT(DISTINCT "robloxId") FILTER (WHERE "robloxId" IS NOT NULL)::int AS "uniquePlayers"
      FROM "GameLog"
      WHERE "gameId" = ${gameId}
        AND event = 'player_action'
        AND "createdAt" >= ${window.start}
        AND "createdAt" < ${window.end}
        AND COALESCE(payload->>'action', '') NOT IN (
          'moderation_applied',
          'moderation_failed',
          'economy',
          'progression'
        )
      GROUP BY 1
      ORDER BY count DESC, 1 ASC
      LIMIT 8
    `,
    prisma.$queryRaw<EconomyRow[]>`
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
      LIMIT 8
    `,
    prisma.$queryRaw<ProgressionRow[]>`
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
      LIMIT 8
    `,
    prisma.$queryRaw<MonetizationRow[]>`
      SELECT
        COALESCE(NULLIF(payload->>'productName', ''), NULLIF(payload->>'itemName', '')) AS "productName",
        COALESCE(NULLIF(payload->>'productId', ''), NULLIF(payload->>'itemId', '')) AS "productId",
        NULLIF(payload->>'itemId', '') AS "itemId",
        NULLIF(payload->>'purchaseType', '') AS "purchaseType",
        NULLIF(payload->>'entry', '') AS entry,
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
        AND (
          COALESCE(payload->>'entry', '') IN ('shop_purchase', 'robux_purchase')
          OR COALESCE(payload->>'currency', '') = 'Robux'
          OR COALESCE(payload->>'purchaseType', '') <> ''
          OR COALESCE(payload->>'productId', '') <> ''
          OR COALESCE(payload->>'itemId', '') <> ''
        )
      GROUP BY 1, 2, 3, 4, 5, 6
      ORDER BY gross DESC, transactions DESC, "productName" ASC
      LIMIT 25
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
        AND (
          COALESCE(payload->>'entry', '') IN ('shop_purchase', 'robux_purchase')
          OR COALESCE(payload->>'currency', '') = 'Robux'
          OR COALESCE(payload->>'purchaseType', '') <> ''
          OR COALESCE(payload->>'productId', '') <> ''
          OR COALESCE(payload->>'itemId', '') <> ''
        )
    `,
    prisma.trackedPlayer.count({
      where: {
        gameId,
        lastSeenAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.trackedPlayer.count({
      where: {
        gameId,
        lastSeenAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.$queryRaw<{ device: string; count: number }[]>`
      SELECT COALESCE(NULLIF(payload->>'device', ''), 'Unknown') as device, COUNT(DISTINCT "robloxId")::int as count
      FROM "GameLog"
      WHERE "gameId" = ${gameId}
        AND event = 'player_action'
        AND payload->>'device' IS NOT NULL
        AND "createdAt" >= ${window.start}
        AND "createdAt" < ${window.end}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `,
    prisma.$queryRaw<{ text: string; count: number }[]>`
      SELECT COALESCE(NULLIF(payload->>'message', ''), 'Unknown Error') as text, COUNT(*)::int as count
      FROM "GameLog"
      WHERE "gameId" = ${gameId}
        AND event = 'player_action'
        AND COALESCE(payload->>'action', '') = 'error'
        AND "createdAt" >= ${window.start}
        AND "createdAt" < ${window.end}
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 8
    `,
  ])

  const monetizationOverview = monetizationOverviewRows[0] ?? {
    purchaseEvents: 0,
    uniqueBuyers: 0,
    robuxSpent: 0,
    nonRobuxSpend: 0,
  }

  return {
    currentOverview,
    previousOverview,
    currentOnlinePlayers,
    liveServersNow,
    activityRows,
    topCustomActionRows,
    economyRows,
    progressionRows,
    monetizationRows,
    monetizationOverview: {
      purchaseEvents: toNumber(monetizationOverview.purchaseEvents),
      uniqueBuyers: toNumber(monetizationOverview.uniqueBuyers),
      robuxSpent: toNumber(monetizationOverview.robuxSpent),
      nonRobuxSpend: toNumber(monetizationOverview.nonRobuxSpend),
    },
    dau: dauCount,
    mau: mauCount,
    platformMix: platformMixRows.map((row) => ({
      label: row.device,
      value: toNumber(row.count),
    })),
    topErrors: topErrorsRows.map((row) => ({
      label: row.text,
      value: toNumber(row.count),
    })),
  }
}
