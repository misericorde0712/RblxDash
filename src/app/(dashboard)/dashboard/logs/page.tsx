import Link from "next/link"
import { Prisma } from "@prisma/client"
import { LogsLiveRefresh } from "./logs-live-refresh"
import { requireCurrentOrg } from "@/lib/auth"
import {
  getGameLogEventDisplay,
  getGameLogEventLabelFromKey,
} from "@/lib/game-log-events"
import { prisma } from "@/lib/prisma"

type LogsRange = "24h" | "7d" | "30d" | "all"
type EventGroupRow = {
  eventKey: string
  count: number | bigint | string
}

export const dynamic = "force-dynamic"

function getSearchValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function getLogsRange(value: string): LogsRange {
  if (value === "24h" || value === "30d" || value === "all") {
    return value
  }

  return "7d"
}

function getRangeStart(range: LogsRange) {
  if (range === "all") {
    return null
  }

  const now = new Date()
  const hoursByRange = {
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  }

  now.setHours(now.getHours() - hoursByRange[range])
  return now
}

function formatDateTime(value: Date) {
  return value.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPayloadPreview(payload: unknown) {
  const rawValue = JSON.stringify(payload)

  if (rawValue.length <= 120) {
    return rawValue
  }

  return `${rawValue.slice(0, 117)}...`
}

function formatPayloadPretty(payload: unknown) {
  return JSON.stringify(payload, null, 2)
}

function createQueryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      searchParams.set(key, value)
    }
  }

  return searchParams.toString()
}

function getSelectedEventFilter(selectedEvent: string): Prisma.GameLogWhereInput | null {
  if (!selectedEvent) {
    return null
  }

  if (selectedEvent.startsWith("action:")) {
    const actionName = selectedEvent.slice("action:".length)

    return {
      event: "player_action",
      payload: {
        path: ["action"],
        equals: actionName,
      },
    }
  }

  return {
    event: selectedEvent,
  }
}

function joinSqlConditions(conditions: Prisma.Sql[]) {
  if (conditions.length === 0) {
    return Prisma.sql`TRUE`
  }

  return conditions.slice(1).reduce(
    (combined, condition) => Prisma.sql`${combined} AND ${condition}`,
    conditions[0] as Prisma.Sql
  )
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { org, currentGame } = await requireCurrentOrg()
  const resolvedSearchParams = (await searchParams) ?? {}
  const rawQuery = getSearchValue(resolvedSearchParams.q)
  const query = rawQuery.trim()
  const selectedEvent = getSearchValue(resolvedSearchParams.event).trim()
  const selectedLogId = getSearchValue(resolvedSearchParams.logId).trim()
  const selectedRange = getLogsRange(getSearchValue(resolvedSearchParams.range))
  const rangeStart = getRangeStart(selectedRange)

  const scopeFilters: Prisma.GameLogWhereInput[] = [
    currentGame
      ? {
          gameId: currentGame.id,
        }
      : {
          game: {
            is: {
              orgId: org.id,
            },
          },
        },
  ]

  if (rangeStart) {
    scopeFilters.push({
      createdAt: {
        gte: rangeStart,
      },
    })
  }

  let matchingPlayerIds: string[] = []

  if (query) {
    const matchingPlayers = await prisma.trackedPlayer.findMany({
      where: {
        ...(currentGame
          ? {
              gameId: currentGame.id,
            }
          : {
              game: {
                is: {
                  orgId: org.id,
                },
              },
            }),
        OR: [
          {
            robloxId: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            username: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        robloxId: true,
      },
      distinct: ["robloxId"],
    })

    matchingPlayerIds = matchingPlayers.map((player) => player.robloxId)
  }

  const queryFilter: Prisma.GameLogWhereInput | null = query
    ? {
        OR: [
          {
            robloxId: {
              contains: query,
              mode: "insensitive",
            },
          },
          ...(matchingPlayerIds.length > 0
            ? [
                {
                  robloxId: {
                    in: matchingPlayerIds,
                  },
                },
              ]
            : []),
        ],
      }
    : null
  const selectedEventFilter = getSelectedEventFilter(selectedEvent)

  const filteredWhere: Prisma.GameLogWhereInput = {
    AND: [
      ...scopeFilters,
      ...(selectedEventFilter ? [selectedEventFilter] : []),
      ...(queryFilter ? [queryFilter] : []),
    ],
  }

  const eventGroupSqlConditions: Prisma.Sql[] = [
    currentGame
      ? Prisma.sql`"gameId" = ${currentGame.id}`
      : Prisma.sql`"gameId" IN (SELECT id FROM "Game" WHERE "orgId" = ${org.id})`,
  ]

  if (rangeStart) {
    eventGroupSqlConditions.push(Prisma.sql`"createdAt" >= ${rangeStart}`)
  }

  if (query) {
    const likeQuery = `%${query}%`

    if (matchingPlayerIds.length > 0) {
      eventGroupSqlConditions.push(
        Prisma.sql`("robloxId" ILIKE ${likeQuery} OR "robloxId" IN (${Prisma.join(
          matchingPlayerIds
        )}))`
      )
    } else {
      eventGroupSqlConditions.push(Prisma.sql`"robloxId" ILIKE ${likeQuery}`)
    }
  }

  const [gameLogs, totalMatchingLogs, uniquePlayers, eventGroups] =
    await Promise.all([
      prisma.gameLog.findMany({
        where: filteredWhere,
        orderBy: {
          createdAt: "desc",
        },
        take: 100,
        select: {
          id: true,
          event: true,
          payload: true,
          robloxId: true,
          createdAt: true,
          gameId: true,
          game: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.gameLog.count({
        where: filteredWhere,
      }),
      prisma.gameLog.groupBy({
        by: ["robloxId"],
        where: {
          AND: [
            filteredWhere,
            {
              robloxId: {
                not: null,
              },
            },
          ],
        },
      }),
      prisma.$queryRaw<EventGroupRow[]>`
        SELECT
          CASE
            WHEN event = 'player_action'
              THEN 'action:' || COALESCE(NULLIF(payload->>'action', ''), 'unknown')
            ELSE event
          END AS "eventKey",
          COUNT(*)::int AS count
        FROM "GameLog"
        WHERE ${joinSqlConditions(eventGroupSqlConditions)}
        GROUP BY 1
        ORDER BY 2 DESC, 1 ASC
      `,
    ])

  const playerIdsInLogs = Array.from(
    new Set(
      gameLogs
        .map((log) => log.robloxId)
        .filter((robloxId): robloxId is string => Boolean(robloxId))
    )
  )
  const gameIdsInLogs = Array.from(new Set(gameLogs.map((log) => log.gameId)))

  const visiblePlayers =
    playerIdsInLogs.length === 0 || gameIdsInLogs.length === 0
      ? []
      : await prisma.trackedPlayer.findMany({
          where: {
            gameId: {
              in: gameIdsInLogs,
            },
            robloxId: {
              in: playerIdsInLogs,
            },
          },
          select: {
            gameId: true,
            robloxId: true,
            username: true,
            displayName: true,
          },
        })

  const playerByLogKey = new Map(
    visiblePlayers.map((player) => [
      `${player.gameId}:${player.robloxId}`,
      player,
    ])
  )

  const selectedLog =
    gameLogs.find((log) => log.id === selectedLogId) ?? gameLogs[0] ?? null
  const eventDisplayByLogId = new Map(
    gameLogs.map((log) => [log.id, getGameLogEventDisplay(log.event, log.payload)])
  )
  const selectedPlayer = selectedLog?.robloxId
    ? playerByLogKey.get(`${selectedLog.gameId}:${selectedLog.robloxId}`) ?? null
    : null
  const selectedLogDisplay = selectedLog
    ? eventDisplayByLogId.get(selectedLog.id) ?? null
    : null

  const sortedEventGroups = eventGroups
  const hasActiveFilters =
    Boolean(query) || Boolean(selectedEvent) || selectedRange !== "7d"
  const selectedEventLabel = selectedEvent
    ? getGameLogEventLabelFromKey(selectedEvent)
    : ""
  const baseQueryParams = {
    q: query || undefined,
    event: selectedEvent || undefined,
    range: selectedRange !== "7d" ? selectedRange : undefined,
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Logs</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {currentGame
              ? `Runtime Roblox events received from ${currentGame.name}.`
              : `Runtime Roblox events received from games connected to ${org.name}.`}
          </p>
        </div>

        <form action="/dashboard/logs" method="GET" className="w-full xl:max-w-5xl">
          <div className="grid gap-3 rounded-xl border border-[#2a2a2a] bg-[#222222] p-4 xl:grid-cols-[minmax(0,1.6fr)_220px_180px_auto_auto]">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by Roblox ID, username, or display name"
              className="rd-input w-full text-sm"
            />
            <select
              name="event"
              defaultValue={selectedEvent}
              className="rd-input text-sm"
            >
              <option value="">All events</option>
              {sortedEventGroups.map((group) => (
                <option key={group.eventKey} value={group.eventKey}>
                  {getGameLogEventLabelFromKey(group.eventKey)} ({group.count})
                </option>
              ))}
            </select>
            <select
              name="range"
              defaultValue={selectedRange}
              className="rd-input text-sm"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
            <button
              type="submit"
              className="rd-button-primary px-4 py-2 text-sm"
            >
              Apply
            </button>
            <Link
              href="/dashboard/logs"
              className="rd-button-secondary px-4 py-2 text-center text-sm"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="rd-card mb-6 p-4 text-sm text-[#9ca3af]">
        {currentGame
          ? `This page is scoped to ${currentGame.name}. Switch games from the sidebar to inspect another feed.`
          : "This page shows runtime game events captured by your Roblox webhook for the current workspace."}{" "}
        Administrative actions now live in `/dashboard/audit`.
      </div>

      <LogsLiveRefresh />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rd-card p-5">
          <p className="rd-label">Matching logs</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalMatchingLogs}</p>
        </div>
        <div className="rd-card p-5">
          <p className="rd-label">Unique players</p>
          <p className="mt-2 text-3xl font-bold text-white">{uniquePlayers.length}</p>
        </div>
        <div className="rd-card p-5">
          <p className="rd-label">Event types</p>
          <p className="mt-2 text-3xl font-bold text-white">{sortedEventGroups.length}</p>
        </div>
      </div>

      {hasActiveFilters ? (
        <div className="rd-banner rd-banner-info mb-6 flex flex-wrap items-center gap-2">
          <span className="font-medium text-white">Active filters</span>
          {query ? (
            <span className="rd-pill border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]">
              Search: {query}
            </span>
          ) : null}
          {selectedEvent ? (
            <span className="rd-pill border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]">
              Event: {selectedEventLabel}
            </span>
          ) : null}
          {selectedRange !== "7d" ? (
            <span className="rd-pill border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]">
              Range: {selectedRange}
            </span>
          ) : null}
        </div>
      ) : null}

      {gameLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-16 text-center">
          <h2 className="text-base font-semibold text-white">
            {hasActiveFilters ? "No matching logs" : "No game logs yet"}
          </h2>
          <p className="mt-2 text-sm text-[#666666]">
            {hasActiveFilters
              ? "Try a broader range or clear one of the filters."
              : "Send webhook events from Roblox to start filling this feed."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rd-table-shell overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-300">
                <thead>
                  <tr>
                    <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                      Time
                    </th>
                    <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                      Player
                    </th>
                    <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                      Event
                    </th>
                    <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                      Details
                    </th>
                    <th className="border-b border-[#2a2a2a] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                      View
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gameLogs.map((log) => {
                    const eventDisplay =
                      eventDisplayByLogId.get(log.id) ??
                      getGameLogEventDisplay(log.event, log.payload)
                    const linkedPlayer = log.robloxId
                      ? playerByLogKey.get(`${log.gameId}:${log.robloxId}`) ?? null
                      : null
                    const rowQuery = createQueryString({
                      ...baseQueryParams,
                      logId: log.id,
                    })
                    const isSelected = selectedLog?.id === log.id

                    return (
                      <tr key={log.id} className={isSelected ? "bg-[#1d1d1d]" : "hover:bg-[#1d1d1d]/60"}>
                        <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                          <div>
                            {log.robloxId ? (
                              <Link
                                href={`/dashboard/players/${encodeURIComponent(log.robloxId)}`}
                                className="font-medium text-white transition hover:text-[#fdba74]"
                              >
                                {linkedPlayer?.displayName ||
                                  linkedPlayer?.username ||
                                  "Unknown player"}
                              </Link>
                            ) : (
                              <p className="font-medium text-white">
                                {linkedPlayer?.displayName ||
                                  linkedPlayer?.username ||
                                  "Unknown player"}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-[#666666]">
                              {log.robloxId ?? "No Roblox ID"}
                            </p>
                          </div>
                        </td>
                        <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${eventDisplay.badgeClassName}`}
                          >
                            {eventDisplay.label}
                          </span>
                        </td>
                        <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                          <span className="break-all">
                            {eventDisplay.summary || formatPayloadPreview(log.payload)}
                          </span>
                        </td>
                        <td className="border-b border-[#2a2a2a] px-4 py-3 text-right align-top">
                          <Link
                            href={rowQuery ? `/dashboard/logs?${rowQuery}` : "/dashboard/logs"}
                            className="text-xs font-medium text-[#e8822a] transition hover:text-[#f1913f]"
                          >
                            Open
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <aside className="space-y-6">
            {selectedLog ? (
              <section className="rd-card p-5">
                <h2 className="text-base font-semibold text-white">Log details</h2>
                <div className="mt-4 space-y-4 text-sm text-[#d1d5db]">
                  <div>
                    <p className="rd-label">Event</p>
                    <p className="mt-1">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                          selectedLogDisplay?.badgeClassName ??
                          "border-[#2a2a2a] bg-[#1a1a1a] text-[#d1d5db]"
                        }`}
                      >
                        {selectedLogDisplay?.label ?? selectedLog.event}
                      </span>
                    </p>
                    <p className="mt-2 text-xs text-[#666666]">
                      Internal key: {selectedLogDisplay?.internalKey ?? selectedLog.event}
                    </p>
                  </div>

                  <div>
                    <p className="rd-label">What happened</p>
                    <p className="mt-1 text-white">
                      {selectedLogDisplay?.summary ||
                        formatPayloadPreview(selectedLog.payload)}
                    </p>
                  </div>

                  <div>
                    <p className="rd-label">Time</p>
                    <p className="mt-1">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>

                  <div>
                    <p className="rd-label">Game</p>
                    <p className="mt-1 text-white">{selectedLog.game.name}</p>
                  </div>

                  <div>
                    <p className="rd-label">Player</p>
                    {selectedLog.robloxId ? (
                      <Link
                        href={`/dashboard/players/${encodeURIComponent(selectedLog.robloxId)}`}
                        className="mt-1 inline-flex text-white transition hover:text-[#fdba74]"
                      >
                        {selectedPlayer?.displayName ||
                          selectedPlayer?.username ||
                          "Unknown player"}
                      </Link>
                    ) : (
                      <p className="mt-1 text-white">
                        {selectedPlayer?.displayName ||
                          selectedPlayer?.username ||
                          "Unknown player"}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#666666]">
                      Roblox ID: {selectedLog.robloxId ?? "None"}
                    </p>
                  </div>

                  <div>
                    <p className="rd-label">Payload</p>
                    <pre className="mt-1 overflow-x-auto rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-3 text-xs text-gray-100">
                      {formatPayloadPretty(selectedLog.payload)}
                    </pre>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rd-card p-5">
              <h2 className="text-base font-semibold text-white">Event breakdown</h2>
              <div className="mt-4 space-y-2">
                {sortedEventGroups.length === 0 ? (
                  <p className="text-sm text-[#666666]">
                    No events found for the current filters.
                  </p>
                ) : (
                  sortedEventGroups.map((group) => {
                    const eventQuery = createQueryString({
                      q: query || undefined,
                      event: group.eventKey,
                      range: selectedRange !== "7d" ? selectedRange : undefined,
                    })

                    return (
                      <Link
                        key={group.eventKey}
                        href={eventQuery ? `/dashboard/logs?${eventQuery}` : "/dashboard/logs"}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                          selectedEvent === group.eventKey
                            ? "border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]"
                            : "border-[#2a2a2a] bg-[#1a1a1a] text-[#d1d5db] hover:border-[#3a3a3a]"
                        }`}
                      >
                        <span>{getGameLogEventLabelFromKey(group.eventKey)}</span>
                        <span className="text-xs text-[#666666]">{group.count}</span>
                      </Link>
                    )
                  })
                )}
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}
