"use client"

import type { ReactNode } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type AnalyticsActivityPoint = {
  label: string
  events: number
  joins: number
  activePlayers: number
}

export type AnalyticsPlayerMixItem = {
  label: string
  value: number
}

export type AnalyticsBarRow = {
  label: string
  value: number
  secondaryLabel?: string
}

export type AnalyticsEconomyRow = {
  label: string
  events: number
  sources: number
  sinks: number
}

const COLORS = {
  amber: "#e8822a",
  amberStrong: "#f1913f",
  amberSoft: "rgba(232,130,42,0.7)",
  amberMuted: "rgba(232,130,42,0.4)",
  amberFaint: "rgba(232,130,42,0.22)",
  grid: "#2a2a2a",
  axis: "#666666",
  text: "#e5e7eb",
  tooltipBg: "#2a2a2a",
  tooltipBorder: "#3a3a3a",
  pie: [
    "#e8822a",
    "rgba(232,130,42,0.78)",
    "rgba(232,130,42,0.58)",
    "rgba(232,130,42,0.38)",
  ],
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-CA", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

function truncateLabel(value: string, maxLength = 16) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}...`
}

function ChartCard(props: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="rd-card p-5">
      <h3 className="text-base font-semibold text-white">{props.title}</h3>
      <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
        {props.description}
      </p>
      <div className="mt-5">{props.children}</div>
    </section>
  )
}

function EmptyChartState({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl border border-dashed px-4 py-8 text-sm"
      style={{ borderColor: "#3a3a3a", color: "#666666" }}
    >
      {children}
    </div>
  )
}

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: "rgba(255,255,255,0.02)" }}
      contentStyle={{
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.tooltipBorder,
        borderRadius: 12,
        color: COLORS.text,
      }}
      labelStyle={{ color: "#ffffff", fontSize: 12, fontWeight: 600 }}
      itemStyle={{ color: COLORS.text, fontSize: 12 }}
      formatter={(value: unknown, name: unknown) => [
        formatCompactNumber(Number(value ?? 0)),
        typeof name === "string" ? name : String(name ?? ""),
      ]}
    />
  )
}

function InsightBar({ children }: { children: ReactNode }) {
  return (
    <div className="rd-ai-bar mb-4">
      <svg
        className="h-4 w-4 shrink-0"
        style={{ color: "#e8822a" }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.75}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 3l1.9 5.85h6.15l-4.97 3.61 1.9 5.84L12 14.69 7.02 18.3l1.9-5.84-4.97-3.61H10.1L12 3z"
        />
      </svg>
      <p className="flex-1 text-xs" style={{ color: "#d1d5db" }}>
        {children}
      </p>
      <svg
        className="h-3.5 w-3.5 shrink-0"
        style={{ color: "#666666" }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </div>
  )
}

export function ActivityAnalyticsSection(props: {
  activity: AnalyticsActivityPoint[]
  playerMix: AnalyticsPlayerMixItem[]
  platformMix: AnalyticsPlayerMixItem[]
  topCustomEvents: AnalyticsBarRow[]
  topErrors: AnalyticsBarRow[]
}) {
  const playerMixTotal = props.playerMix.reduce((sum, item) => sum + item.value, 0)
  const platformMixTotal = props.platformMix.reduce((sum, item) => sum + item.value, 0)

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
        <ChartCard
          title="Activity trend"
          description="Compare events, joins, and active players across the selected window."
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={props.activity} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={COLORS.axis}
                  tick={{ fill: COLORS.axis, fontSize: 12 }}
                  minTickGap={28}
                />
                <YAxis
                  stroke={COLORS.axis}
                  tick={{ fill: COLORS.axis, fontSize: 12 }}
                  width={44}
                />
                <ChartTooltip />
                <Legend wrapperStyle={{ color: COLORS.text, fontSize: 12 }} />
                <Bar dataKey="events" name="Events" fill={COLORS.amber} radius={[6, 6, 0, 0]} />
                <Bar dataKey="joins" name="Joins" fill={COLORS.amberSoft} radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="activePlayers"
                  name="Active players"
                  fill={COLORS.amberMuted}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Player mix"
          description="See how much of the window came from new players versus returning players."
        >
          <InsightBar>
            New-player share is easiest to compare when your onboarding events are tracked consistently.
          </InsightBar>

          {props.playerMix.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_0.85fr] lg:items-center">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={props.playerMix}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={58}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {props.playerMix.map((entry, index) => (
                        <Cell key={entry.label} fill={COLORS.pie[index % COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {props.playerMix.map((item, index) => {
                  const percentage =
                    playerMixTotal > 0 ? Math.round((item.value / playerMixTotal) * 100) : 0

                  return (
                    <div key={item.label} className="rd-card-quiet px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS.pie[index % COLORS.pie.length] }}
                          />
                          <p className="text-sm text-white">{item.label}</p>
                        </div>
                        <p className="text-sm" style={{ color: "#9ca3af" }}>
                          {formatCompactNumber(item.value)} ({percentage}%)
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <EmptyChartState>No player activity was received for this window yet.</EmptyChartState>
          )}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.55fr]">
        <ChartCard
          title="Device mix"
          description="Hardware platforms players used to join."
        >
          <InsightBar>
            Track device in the payload of player_join to populate this.
          </InsightBar>

          {props.platformMix.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-1 lg:items-center">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={props.platformMix}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={48}
                      outerRadius={76}
                      paddingAngle={2}
                    >
                      {props.platformMix.map((entry, index) => (
                        <Cell key={entry.label} fill={COLORS.pie[index % COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                {props.platformMix.map((item, index) => {
                  const percentage =
                    platformMixTotal > 0 ? Math.round((item.value / platformMixTotal) * 100) : 0

                  return (
                    <div key={item.label} className="rd-card-quiet px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: COLORS.pie[index % COLORS.pie.length] }}
                          />
                          <p className="text-sm text-white">{item.label}</p>
                        </div>
                        <p className="text-sm" style={{ color: "#9ca3af" }}>
                          {formatCompactNumber(item.value)} ({percentage}%)
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <EmptyChartState>No device data available.</EmptyChartState>
          )}
        </ChartCard>

        <div className="grid gap-4 grid-rows-[auto_auto]">
          <ChartCard
            title="Top custom events"
            description="The TrackEvent actions that happened the most in this window."
          >
            {props.topCustomEvents.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={props.topCustomEvents}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      stroke={COLORS.axis}
                      tick={{ fill: COLORS.axis, fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      stroke={COLORS.axis}
                      tick={{ fill: COLORS.axis, fontSize: 12 }}
                      tickFormatter={(value) => truncateLabel(String(value))}
                    />
                    <ChartTooltip />
                    <Bar dataKey="value" name="Events" fill={COLORS.amber} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState>No custom events were received for this window.</EmptyChartState>
            )}
          </ChartCard>

          <ChartCard
            title="Top Client Errors"
            description="The TrackError actions that happened the most."
          >
            {props.topErrors.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={props.topErrors}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid stroke={COLORS.grid} horizontal={false} />
                    <XAxis
                      type="number"
                      stroke={COLORS.axis}
                      tick={{ fill: COLORS.axis, fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={120}
                      stroke={COLORS.axis}
                      tick={{ fill: COLORS.axis, fontSize: 12 }}
                      tickFormatter={(value) => truncateLabel(String(value))}
                    />
                    <ChartTooltip />
                    <Bar dataKey="value" name="Events" fill="#ef4444" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyChartState>No errors were logged for this window.</EmptyChartState>
            )}
          </ChartCard>
        </div>
      </div>
    </>
  )
}

export function MonetizationAnalyticsChart(props: {
  economy: AnalyticsEconomyRow[]
}) {
  return (
    <ChartCard
      title="Economy by currency"
      description="Sources and sinks grouped by currency for TrackEconomy events."
    >
      <InsightBar>
        Monetization becomes much easier to read when product names and purchase types are sent in every economy event.
      </InsightBar>

      {props.economy.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={props.economy} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
              <CartesianGrid stroke={COLORS.grid} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={COLORS.axis}
                tick={{ fill: COLORS.axis, fontSize: 12 }}
                tickFormatter={(value) => truncateLabel(String(value), 12)}
              />
              <YAxis
                stroke={COLORS.axis}
                tick={{ fill: COLORS.axis, fontSize: 12 }}
                width={44}
              />
              <ChartTooltip />
              <Legend wrapperStyle={{ color: COLORS.text, fontSize: 12 }} />
              <Bar dataKey="sources" name="Sources" fill={COLORS.amberMuted} radius={[6, 6, 0, 0]} />
              <Bar dataKey="sinks" name="Sinks" fill={COLORS.amber} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChartState>No economy events were received for this window.</EmptyChartState>
      )}
    </ChartCard>
  )
}

export function ProgressionAnalyticsChart(props: {
  progression: AnalyticsBarRow[]
}) {
  return (
    <ChartCard
      title="Progression"
      description="The progression steps that fired the most in this window."
    >
      {props.progression.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={props.progression}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
            >
              <CartesianGrid stroke={COLORS.grid} horizontal={false} />
              <XAxis
                type="number"
                stroke={COLORS.axis}
                tick={{ fill: COLORS.axis, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={120}
                stroke={COLORS.axis}
                tick={{ fill: COLORS.axis, fontSize: 12 }}
                tickFormatter={(value) => truncateLabel(String(value))}
              />
              <ChartTooltip />
              <Bar dataKey="value" name="Events" fill={COLORS.amber} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChartState>No progression data was received for this window.</EmptyChartState>
      )}
    </ChartCard>
  )
}
