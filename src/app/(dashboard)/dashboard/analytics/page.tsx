import Link from "next/link"
import { requireCurrentOrg } from "@/lib/auth"
import {
  buildTimeline,
  getAnalyticsDataset,
  getAnalyticsWindow,
  toNumber,
  type AnalyticsRange,
} from "@/lib/game-analytics"
import { cleanupStaleLivePresence } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import {
  ActivityAnalyticsSection,
  MonetizationAnalyticsChart,
  ProgressionAnalyticsChart,
} from "./analytics-charts"

function formatDateTime(value: Date) {
  return value.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  })
}

function formatDuration(totalSeconds: number) {
  if (!totalSeconds || totalSeconds <= 0) return "0s"
  const m = Math.floor(totalSeconds / 60)
  const s = Math.round(totalSeconds % 60)
  if (m === 0) return `${s}s`
  const h = Math.floor(m / 60)
  const remainingM = m % 60
  if (h === 0) return `${m}m ${s}s`
  return `${h}h ${remainingM}m`
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-CA", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value)
}

function formatDelta(currentValue: number, previousValue: number) {
  const diff = currentValue - previousValue

  if (diff === 0) {
    return {
      label: "Stable vs previous window",
      className: "",
    }
  }

  const direction = diff > 0 ? "↑" : "↓"
  const className = diff > 0 ? "text-green-300" : "text-yellow-300"

  return {
    label: `${direction} ${Math.abs(diff)} vs previous window`,
    className,
  }
}

function humanizeIdentifier(value: string) {
  const normalized = value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")

  if (!normalized) {
    return "Unknown"
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getMonetizationProductLabel(row: {
  productName: string | null
  productId: string | null
  itemId: string | null
  entry: string | null
}) {
  if (row.productName) {
    return row.productName
  }

  if (row.productId) {
    return `Product ${row.productId}`
  }

  if (row.itemId) {
    return `Item ${row.itemId}`
  }

  if (row.entry) {
    return humanizeIdentifier(row.entry)
  }

  return "Unlabeled purchase"
}

function getMonetizationChannelLabel(row: {
  purchaseType: string | null
  entry: string | null
  currency: string | null
}) {
  if (row.purchaseType) {
    return humanizeIdentifier(row.purchaseType)
  }

  if (row.entry) {
    return humanizeIdentifier(row.entry)
  }

  if (row.currency === "Robux") {
    return "Robux purchase"
  }

  return "Tracked purchase"
}

function SurfaceCard(props: {
  children: React.ReactNode
  className?: string
  tone?: "default" | "activity" | "monetization" | "progression"
}) {
  return (
    <section className={`rd-card p-6 ${props.className ?? ""}`}>
      {props.children}
    </section>
  )
}

function SectionHeader(props: {
  eyebrow: string
  title: string
  description: string
  tone?: "default" | "activity" | "monetization" | "progression"
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="rd-label" style={{ color: "#666666" }}>{props.eyebrow}</p>
        <h2 className="mt-2 text-xl font-semibold text-white">{props.title}</h2>
        <p className="mt-2 text-sm leading-6" style={{ color: "#9ca3af" }}>{props.description}</p>
      </div>
      {props.actions ? <div className="flex flex-wrap gap-2">{props.actions}</div> : null}
    </div>
  )
}

function StatCard(props: {
  label: string
  value: string
  sublabel: string
  sublabelClassName?: string
  tone?: "default" | "green" | "blue" | "cyan"
}) {
  return (
    <div className="rd-card-muted p-5">
      <p className="rd-label mb-1">{props.label}</p>
      <p className="text-3xl font-bold text-white">{props.value}</p>
      <p className={`mt-2 text-sm ${props.sublabelClassName ?? ""}`} style={!props.sublabelClassName ? { color: "#9ca3af" } : undefined}>
        {props.sublabel}
      </p>
    </div>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { currentGame } = await requireCurrentOrg()
  const resolvedSearchParams = (await searchParams) ?? {}
  const window = getAnalyticsWindow(resolvedSearchParams)

  if (!currentGame) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
          Select a game in the sidebar to see its metrics.
        </p>

        <div
          className="mt-8 rounded-xl p-5 text-sm"
          style={{
            border: "1px solid rgba(232,130,42,0.22)",
            background: "rgba(232,130,42,0.08)",
            color: "#e8822a",
          }}
        >
          No active game is selected right now. Go to{" "}
          <Link href="/dashboard/games" className="font-medium underline">
            Games
          </Link>{" "}
          to connect a Roblox game, then come back here.
        </div>
      </div>
    )
  }

  await cleanupStaleLivePresence(prisma, { gameId: currentGame.id })

  const dataset = await getAnalyticsDataset(prisma, {
    gameId: currentGame.id,
    window,
  })

  const timeline = buildTimeline({
    rows: dataset.activityRows,
    bucketUnit: window.bucketUnit,
    start: window.start,
    bucketCount: window.bucketCount,
  })
  const currentEventsDelta = formatDelta(
    dataset.currentOverview.totalEvents,
    dataset.previousOverview.totalEvents
  )
  const currentJoinsDelta = formatDelta(
    dataset.currentOverview.joins,
    dataset.previousOverview.joins
  )
  const currentPlayersDelta = formatDelta(
    dataset.currentOverview.uniquePlayers,
    dataset.previousOverview.uniquePlayers
  )
  const currentNewPlayersDelta = formatDelta(
    dataset.currentOverview.newPlayers,
    dataset.previousOverview.newPlayers
  )
  const diffSession = dataset.currentOverview.averageSessionSeconds - dataset.previousOverview.averageSessionSeconds
  const currentSessionLengthDelta = {
    label: diffSession === 0 ? "Stable vs previous window" : `${diffSession > 0 ? "↑" : "↓"} ${formatDuration(Math.abs(diffSession))} vs previous window`,
    className: diffSession === 0 ? "" : diffSession > 0 ? "text-green-300" : "text-yellow-300",
  }

  const conversionRate = dataset.currentOverview.uniquePlayers > 0
    ? (dataset.monetizationOverview.uniqueBuyers / dataset.currentOverview.uniquePlayers) * 100
    : 0

  const arppu = dataset.monetizationOverview.uniqueBuyers > 0
    ? dataset.monetizationOverview.robuxSpent / dataset.monetizationOverview.uniqueBuyers
    : 0

  const stickiness = dataset.mau > 0
    ? (dataset.dau / dataset.mau) * 100
    : 0

  const activityChartData = timeline.map((bucket) => ({
    label: bucket.label,
    events: bucket.events,
    joins: bucket.joins,
    activePlayers: bucket.uniquePlayers,
  }))
  const playerMixData = [
    {
      label: "New players",
      value: dataset.currentOverview.newPlayers,
    },
    {
      label: "Returning players",
      value: dataset.currentOverview.returningPlayers,
    },
  ].filter((segment) => segment.value > 0)
  const topCustomEventRows = dataset.topCustomActionRows.map((row) => ({
    label: row.action ?? "unknown",
    value: toNumber(row.count),
  }))
  const progressionChartRows = dataset.progressionRows.map((row) => ({
    label: row.step ?? "unknown",
    value: toNumber(row.count),
  }))
  const economyChartRows = dataset.economyRows.map((row) => ({
    label: row.currency ?? "Unknown",
    events: toNumber(row.events),
    sources: toNumber(row.sources),
    sinks: toNumber(row.sinks),
  }))
  const newPlayerShare =
    dataset.currentOverview.uniquePlayers > 0
      ? Math.round(
        (dataset.currentOverview.newPlayers /
          dataset.currentOverview.uniquePlayers) *
        100
      )
      : 0
  const exportQuery = new URLSearchParams()
  exportQuery.set("range", window.selectedRange)
  exportQuery.set("from", window.fromInput)
  exportQuery.set("to", window.toInput)

  return (
    <div className="p-8">
      <div className="space-y-6">
        <SurfaceCard tone="default">
          <SectionHeader
            eyebrow="Analytics"
            title={`Analytics for ${currentGame.name}`}
            description="Organized around three goals: understand activity, read monetization cleanly, and spot progression patterns."
            actions={
              <>
                <Link
                  href={`/api/analytics/export?kind=overview&${exportQuery.toString()}`}
                  className="rd-button-secondary"
                >
                  Export summary CSV
                </Link>
                <Link
                  href={`/api/analytics/export?kind=monetization&${exportQuery.toString()}`}
                  className="rd-button-secondary"
                >
                  Export monetization CSV
                </Link>
              </>
            }
          />

          <div className="mt-6 grid gap-4 xl:grid-cols-[auto_1fr_0.8fr]">
            <form action="/dashboard/analytics" method="GET">
              <div className="rd-card-muted flex flex-wrap gap-2 p-2">
                {(["24h", "7d", "30d"] as AnalyticsRange[]).map((range) => {
                  const active = range === window.selectedRange

                  return (
                    <button
                      key={range}
                      type="submit"
                      name="range"
                      value={range}
                      className={`rounded-lg px-3 py-2 text-sm transition ${active ? "text-white" : "text-[#9ca3af] hover:text-white"
                        }`}
                      style={{
                        background: active ? "#e8822a" : "transparent",
                      }}
                    >
                      {range}
                    </button>
                  )
                })}
              </div>
            </form>

            <form
              action="/dashboard/analytics"
              method="GET"
              className="rd-card-muted p-3"
            >
              <input type="hidden" name="range" value="custom" />
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="rd-label mb-1.5 block">
                    From
                  </label>
                  <input
                    className="rd-input text-sm"
                    defaultValue={window.fromInput}
                    name="from"
                    type="date"
                  />
                </div>
                <div>
                  <label className="rd-label mb-1.5 block">
                    To
                  </label>
                  <input
                    className="rd-input text-sm"
                    defaultValue={window.toInput}
                    name="to"
                    type="date"
                  />
                </div>
                <button type="submit" className="rd-button-primary">
                  Apply custom range
                </button>
              </div>
            </form>

            <div className="rd-card-muted px-4 py-4 text-sm">
              <p className="rd-label">
                Current window
              </p>
              <p className="mt-2 font-medium text-white">
                {formatDateTime(window.start)} to {formatDateTime(window.end)}
              </p>
              <p className="mt-2 leading-6" style={{ color: "#9ca3af" }}>
                Use presets for quick reads, or set an exact date range when you
                want to inspect a launch, an event, or a monetization push.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard tone="activity">
          <SectionHeader
            eyebrow="Activity"
            title="Gameplay activity"
            description="Core telemetry first: events, joins, active players, and the custom actions that shaped the selected window."
            tone="activity"
            actions={
              <Link
                href="/dashboard/logs"
                className="rd-button-secondary"
              >
                Open logs
              </Link>
            }
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Events"
              value={formatCompactNumber(dataset.currentOverview.totalEvents)}
              sublabel={currentEventsDelta.label}
              sublabelClassName={currentEventsDelta.className}
            />
            <StatCard
              label="Joins"
              value={formatCompactNumber(dataset.currentOverview.joins)}
              sublabel={currentJoinsDelta.label}
              sublabelClassName={currentJoinsDelta.className}
              tone="green"
            />
            <StatCard
              label="Active players"
              value={formatCompactNumber(dataset.currentOverview.uniquePlayers)}
              sublabel={currentPlayersDelta.label}
              sublabelClassName={currentPlayersDelta.className}
              tone="blue"
            />
            <StatCard
              label="New players"
              value={formatCompactNumber(dataset.currentOverview.newPlayers)}
              sublabel={currentNewPlayersDelta.label}
              sublabelClassName={currentNewPlayersDelta.className}
              tone="cyan"
            />
            <StatCard
              label="Avg session time"
              value={formatDuration(dataset.currentOverview.averageSessionSeconds)}
              sublabel={currentSessionLengthDelta.label}
              sublabelClassName={currentSessionLengthDelta.className}
              tone="default"
            />
            <StatCard
              label="Stickiness"
              value={`${formatAmount(stickiness)}%`}
              sublabel={`${formatCompactNumber(dataset.dau)} DAU / ${formatCompactNumber(dataset.mau)} MAU`}
              tone="default"
            />
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rd-card-muted px-4 py-4">
              <p className="rd-label">
                New player share
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {dataset.currentOverview.uniquePlayers > 0
                  ? `${newPlayerShare}% new`
                  : "No activity"}
              </p>
              <p className="mt-2 text-sm" style={{ color: "#9ca3af" }}>
                {dataset.currentOverview.uniquePlayers > 0
                  ? `${formatCompactNumber(dataset.currentOverview.returningPlayers)} returning players in the same window.`
                  : "No joins or events were recorded yet for this range."}
              </p>
            </div>

            <div className="rd-card-muted px-4 py-4">
              <p className="rd-label">
                Live snapshot
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {dataset.liveServersNow > 0
                  ? `${dataset.liveServersNow} servers / ${dataset.currentOnlinePlayers} players`
                  : "No live servers"}
              </p>
              <p className="mt-2 text-sm" style={{ color: "#9ca3af" }}>
                Based on the latest heartbeats sent by the Roblox integration.
              </p>
            </div>

            <div className="rd-card-muted px-4 py-4">
              <p className="rd-label">
                Tracking coverage
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                Custom events, joins, heartbeats
              </p>
              <p className="mt-2 text-sm" style={{ color: "#9ca3af" }}>
                Your game already sends the base telemetry. Keep expanding
                `TrackEvent` coverage to make the activity section more useful.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <ActivityAnalyticsSection
              activity={activityChartData}
              playerMix={playerMixData}
              platformMix={dataset.platformMix}
              topCustomEvents={topCustomEventRows}
              topErrors={dataset.topErrors}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard tone="monetization">
          <SectionHeader
            eyebrow="Monetization"
            title="Purchase and spend visibility"
            description="Everything purchase-related lives here: monetization KPIs, currency flow, and the detailed purchase table."
            tone="monetization"
            actions={
              <Link
                href={`/api/analytics/export?kind=monetization&${exportQuery.toString()}`}
                className="rd-button-secondary"
              >
                Export monetization CSV
              </Link>
            }
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Purchase events"
              value={formatCompactNumber(dataset.monetizationOverview.purchaseEvents)}
              sublabel="Tracked purchase sinks in this window"
              tone="blue"
            />
            <StatCard
              label="Unique buyers"
              value={formatCompactNumber(dataset.monetizationOverview.uniqueBuyers)}
              sublabel="Distinct buyers seen in purchase events"
              tone="cyan"
            />
            <StatCard
              label="Robux spent"
              value={`${formatAmount(dataset.monetizationOverview.robuxSpent)} Robux`}
              sublabel="Only what your game explicitly tracked"
              tone="green"
            />
            <StatCard
              label="Non-Robux spend"
              value={formatAmount(dataset.monetizationOverview.nonRobuxSpend)}
              sublabel="Tracked sinks such as Coins or Gems"
              tone="default"
            />
            <StatCard
              label="ARPPU (Robux)"
              value={formatAmount(arppu)}
              sublabel="Avg revenue per paying buyer"
              tone="default"
            />
            <StatCard
              label="Conversion rate"
              value={`${formatAmount(conversionRate)}%`}
              sublabel="Active players that bought"
              tone="default"
            />
          </div>

          <div className="mt-6">
            <MonetizationAnalyticsChart economy={economyChartRows} />
          </div>

          <div className="rd-card-muted mt-6 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Monetization table
                </h3>
                <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                  Purchase-focused rows built from tracked economy sink events.
                  This reflects only what your Roblox code sent to Dashblox.
                </p>
              </div>
              <div className="rounded-full px-3 py-1.5 text-xs font-medium" style={{ border: "1px solid #3a3a3a", background: "#1a1a1a", color: "#9ca3af" }}>
                {dataset.monetizationRows.length} rows
              </div>
            </div>

            {dataset.monetizationRows.length > 0 ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em]" style={{ color: "#666666" }}>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Product</th>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Channel</th>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Currency</th>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Transactions</th>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Buyers</th>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Gross</th>
                      <th className="border-b px-4 py-3" style={{ borderColor: "#2a2a2a" }}>Avg order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dataset.monetizationRows.map((row, index) => (
                      <tr
                        key={`${row.productName ?? "product"}-${row.productId ?? row.itemId ?? "unknown"}-${row.entry ?? "entry"}-${index}`}
                        className="text-sm transition hover:bg-white/[0.02]"
                        style={{ color: "#9ca3af" }}
                      >
                        <td className="border-b px-4 py-3 align-top" style={{ borderColor: "#2a2a2a" }}>
                          <p className="font-medium text-white">
                            {getMonetizationProductLabel(row)}
                          </p>
                          {(row.productId || row.itemId) ? (
                            <p className="mt-1 text-xs" style={{ color: "#666666" }}>
                              ID {row.productId ?? row.itemId}
                            </p>
                          ) : null}
                        </td>
                        <td className="border-b px-4 py-3 align-top" style={{ borderColor: "#2a2a2a" }}>
                          {getMonetizationChannelLabel(row)}
                        </td>
                        <td className="border-b px-4 py-3 align-top" style={{ borderColor: "#2a2a2a" }}>
                          {row.currency ?? "Unknown"}
                        </td>
                        <td className="border-b px-4 py-3 align-top" style={{ borderColor: "#2a2a2a" }}>
                          {formatCompactNumber(toNumber(row.transactions))}
                        </td>
                        <td className="border-b px-4 py-3 align-top" style={{ borderColor: "#2a2a2a" }}>
                          {formatCompactNumber(toNumber(row.uniqueBuyers))}
                        </td>
                        <td className="border-b px-4 py-3 align-top font-medium text-white" style={{ borderColor: "#2a2a2a" }}>
                          {formatAmount(toNumber(row.gross))} {row.currency ?? ""}
                        </td>
                        <td className="border-b px-4 py-3 align-top" style={{ borderColor: "#2a2a2a" }}>
                          {formatAmount(toNumber(row.avgOrderValue))} {row.currency ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed px-4 py-8 text-sm" style={{ borderColor: "#3a3a3a", color: "#666666" }}>
                No purchase-focused monetization data was received for this window.
                Track Robux purchases or shop purchases to fill this table.
              </div>
            )}
          </div>
        </SurfaceCard>

        <SurfaceCard tone="progression">
          <SectionHeader
            eyebrow="Progression"
            title="Progression and next steps"
            description="Keep the last section focused on advancement systems, quest steps, and what to instrument next."
            tone="progression"
          />

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ProgressionAnalyticsChart progression={progressionChartRows} />

            <div className="rd-card-muted p-5">
              <h3 className="text-base font-semibold text-white">
                Recommended game-side steps
              </h3>
              <div className="mt-4 space-y-3 text-sm" style={{ color: "#9ca3af" }}>
                <div className="rd-card-quiet px-4 py-3">
                  <p className="font-medium text-white">TrackEvent</p>
                  <p className="mt-1">
                    Use it for match start or end, reward granted, purchase completed,
                    or quest completed.
                  </p>
                </div>
                <div className="rd-card-quiet px-4 py-3">
                  <p className="font-medium text-white">TrackEconomy</p>
                  <p className="mt-1">
                    Use it for rewards, shop purchases, refunds, premium payouts,
                    Robux purchases, game passes, and developer products.
                  </p>
                </div>
                <div className="rd-card-quiet px-4 py-3">
                  <p className="font-medium text-white">TrackProgression</p>
                  <p className="mt-1">
                    Use it for tutorial completed, level reached, quest completed,
                    and unlock milestones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  )
}
