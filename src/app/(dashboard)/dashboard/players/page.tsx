import Link from "next/link"
import { cleanupStaleLivePresence, getLiveServerCutoff } from "@/lib/live-presence"
import { requireCurrentOrg } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function getTwentyFourHoursAgo() {
  const referenceDate = new Date()
  referenceDate.setHours(referenceDate.getHours() - 24)
  return referenceDate
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

function getSearchValue(
  value: string | string[] | undefined
): string {
  if (Array.isArray(value)) {
    return value[0] ?? ""
  }

  return value ?? ""
}

function formatJobId(jobId: string | null) {
  if (!jobId) {
    return "No live server"
  }

  if (jobId.startsWith("studio-")) {
    return "Studio"
  }

  return jobId.slice(0, 8)
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { org, currentGame } = await requireCurrentOrg()
  const resolvedSearchParams = (await searchParams) ?? {}
  const rawQuery = getSearchValue(resolvedSearchParams.q)
  const query = rawQuery.trim()

  if (!currentGame) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Player tracking appears here once you select a game.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-white">
            No active game selected
          </h2>
          <p className="mt-2 text-sm text-[#666666]">
            This workspace does not have a current game yet. Pick a game from
            the sidebar or connect one from the Games page.
          </p>
          <Link
            href="/dashboard/games"
            className="rd-button-primary mt-6"
          >
            Open games
          </Link>
        </div>
      </div>
    )
  }

  const twentyFourHoursAgo = getTwentyFourHoursAgo()
  const liveCutoff = getLiveServerCutoff()
  await cleanupStaleLivePresence(prisma, { gameId: currentGame.id })
  const whereClause = {
    gameId: currentGame.id,
    ...(query
      ? {
          OR: [
            {
              robloxId: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              username: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              displayName: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  }

  const [players, totalPlayers, activePlayers24h, onlinePlayersNow, liveServersNow] =
    await Promise.all([
      prisma.trackedPlayer.findMany({
        where: whereClause,
        orderBy: [
          {
            isOnline: "desc",
          },
          {
            lastSeenAt: "desc",
          },
          {
            firstSeenAt: "desc",
          },
        ],
        take: 100,
        include: {
          _count: {
            select: {
              sanctions: true,
              notes: true,
            },
          },
        },
      }),
      prisma.trackedPlayer.count({
        where: {
          gameId: currentGame.id,
        },
      }),
      prisma.trackedPlayer.count({
        where: {
          gameId: currentGame.id,
          lastSeenAt: {
            gte: twentyFourHoursAgo,
          },
        },
      }),
      prisma.trackedPlayer.count({
        where: {
          gameId: currentGame.id,
          isOnline: true,
        },
      }),
      prisma.liveServer.count({
        where: {
          gameId: currentGame.id,
          lastHeartbeatAt: {
            gte: liveCutoff,
          },
        },
      }),
    ])

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Players</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Tracked Roblox players for {currentGame.name} in {org.name}.
          </p>
        </div>

        <form action="/dashboard/players" method="GET" className="w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search by username, display name, or Roblox ID"
              className="rd-input w-full text-sm"
            />
            <button
              type="submit"
              className="rd-button-primary"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      <div className="rd-card mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="rd-label">Total tracked</p>
            <p className="mt-2 text-3xl font-bold text-white">{totalPlayers}</p>
          </div>
          <div>
            <p className="rd-label">Live now</p>
            <p className="mt-2 text-3xl font-bold text-white">{onlinePlayersNow}</p>
          </div>
          <div>
            <p className="rd-label">Active in 24h</p>
            <p className="mt-2 text-3xl font-bold text-white">
              {activePlayers24h}
            </p>
          </div>
          <div>
            <p className="rd-label">Live servers</p>
            <p className="mt-2 text-3xl font-bold text-white">{liveServersNow}</p>
          </div>
        </div>
      </div>

      <div className="rd-card mb-6 p-4 text-sm text-[#9ca3af]">
        This page is scoped to {currentGame.name}. Switch games from the
        sidebar to inspect a different player list. Live status is driven by
        Roblox server heartbeats and player session events.
      </div>

      {query ? (
        <div className="rd-banner rd-banner-info mb-6">
          Showing results for <span className="font-medium text-white">{query}</span>.
        </div>
      ) : null}

      {players.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-16 text-center">
          <h2 className="text-base font-semibold text-white">
            {query ? "No matching players" : "No tracked players yet"}
          </h2>
          <p className="mt-2 text-sm text-[#666666]">
            {query
              ? "Try a different username, display name, or Roblox ID."
              : "Tracked players will appear here after Roblox sends player events to the webhook."}
          </p>
        </div>
      ) : (
        <div className="rd-table-shell overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-300">
              <thead>
                <tr>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Player
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Roblox ID
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Live
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    First seen
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Last seen
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Notes
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Sanctions
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="hover:bg-[#1d1d1d]/60">
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                      <div>
                        <Link
                          href={`/dashboard/players/${encodeURIComponent(player.robloxId)}`}
                          className="font-medium text-white transition hover:text-[#fdba74]"
                        >
                          {player.displayName || player.username || "Unknown player"}
                        </Link>
                        <p className="mt-1 text-xs text-[#666666]">
                          @{player.username ?? "unknown"}
                        </p>
                      </div>
                    </td>
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                      {player.robloxId}
                    </td>
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
                            player.isOnline
                              ? "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
                              : "border-[#2a2a2a] bg-[#1a1a1a] text-[#d1d5db]"
                          }`}
                        >
                          {player.isOnline ? "Online" : "Offline"}
                        </span>
                        <p className="text-xs text-[#666666]">
                          {formatJobId(player.currentServerJobId)}
                        </p>
                      </div>
                    </td>
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                      {formatDateTime(player.firstSeenAt)}
                    </td>
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                      {formatDateTime(player.lastSeenAt)}
                    </td>
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                      <span className="rd-pill">
                        {player._count.notes}
                      </span>
                    </td>
                    <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                      <span className="rd-pill">
                        {player._count.sanctions}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
