import Link from "next/link"
import { notFound } from "next/navigation"
import { OrgRole } from "@prisma/client"
import { requireCurrentOrg } from "@/lib/auth"
import { hasRequiredRole } from "@/lib/org-members"
import { getLiveServerCutoff } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import { fetchAllPublicServers } from "@/lib/roblox-servers"
import { fetchPlayerThumbnails } from "@/lib/roblox-servers"
import ServerPlayerActions from "./server-player-actions"
import ServerActions from "./server-actions"

function formatUptime(startedAt: Date, now: Date) {
  const diffMs = now.getTime() - startedAt.getTime()
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`
  }

  return `${minutes}m ${seconds}s`
}

function formatRelativeTime(date: Date, now: Date) {
  const diffMs = now.getTime() - date.getTime()
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

function formatDateTime(value: Date) {
  return value.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatJobIdShort(jobId: string) {
  if (jobId.startsWith("studio-")) {
    return "Studio"
  }
  return jobId.slice(0, 12)
}

export default async function ServerDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>
}) {
  const { jobId: rawJobId } = await params
  const jobId = decodeURIComponent(rawJobId)
  const { currentGame, member } = await requireCurrentOrg()
  const isAdmin = hasRequiredRole(member.role, OrgRole.ADMIN)

  if (!currentGame) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Server Details</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Select a game to view server details.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-white">
            No active game selected
          </h2>
          <Link href="/dashboard/games" className="rd-button-primary mt-6">
            Open games
          </Link>
        </div>
      </div>
    )
  }

  const now = new Date()
  const liveCutoff = getLiveServerCutoff(now)

  const server = await prisma.liveServer.findFirst({
    where: {
      gameId: currentGame.id,
      jobId,
      lastHeartbeatAt: { gte: liveCutoff },
    },
  })

  if (!server) {
    notFound()
  }

  // Fetch game for universeId
  const game = await prisma.game.findUnique({
    where: { id: currentGame.id },
    select: { robloxUniverseId: true },
  })

  // Fetch players, Roblox data, and thumbnails in parallel
  const [players, robloxServers, recentLogs] = await Promise.all([
    prisma.trackedPlayer.findMany({
      where: {
        gameId: currentGame.id,
        currentServerJobId: jobId,
        isOnline: true,
      },
      orderBy: { lastSeenAt: "desc" },
      include: {
        _count: {
          select: {
            sanctions: true,
            notes: true,
          },
        },
      },
    }),
    game?.robloxUniverseId
      ? fetchAllPublicServers(game.robloxUniverseId)
      : Promise.resolve([]),
    prisma.gameLog.findMany({
      where: {
        gameId: currentGame.id,
        OR: [
          { event: "server_started", payload: { path: ["jobId"], equals: jobId } },
          { event: "player_join", payload: { path: ["jobId"], equals: jobId } },
          { event: "player_leave", payload: { path: ["jobId"], equals: jobId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        event: true,
        robloxId: true,
        createdAt: true,
      },
    }),
  ])

  const robloxData = robloxServers.find((rs) => rs.id === jobId) ?? null

  // Fetch player thumbnails
  const playerIds = players.map((p) => p.robloxId)
  const thumbnails = await fetchPlayerThumbnails(playerIds)

  const heartbeatAge = Math.floor(
    (now.getTime() - server.lastHeartbeatAt.getTime()) / 1000
  )
  const isHealthy = heartbeatAge < 45
  const isWarning = heartbeatAge >= 45 && heartbeatAge < 75

  return (
    <div className="rd-page-enter p-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/servers"
          className="text-[#e8822a] transition hover:text-[#f1913f]"
        >
          Servers
        </Link>
        <span className="text-[#666666]">/</span>
        <span className="text-[#9ca3af]">{formatJobIdShort(jobId)}</span>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Server {formatJobIdShort(jobId)}
          </h1>
          <p className="mt-1 text-xs font-mono text-[#666666]">{jobId}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-3 py-1.5 text-sm font-medium ${
            isHealthy
              ? "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
              : isWarning
                ? "border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.08)] text-[#fde68a]"
                : "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]"
          }`}
        >
          {isHealthy ? "Healthy" : isWarning ? "Slow heartbeat" : "Stale"}
        </span>
      </div>

      {/* Server info cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rd-card p-4">
          <p className="rd-label">Region</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {server.region ?? "Unknown"}
          </p>
        </div>
        <div className="rd-card p-4">
          <p className="rd-label">Players</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {server.lastPlayerCount}
            {robloxData && (
              <span className="text-sm font-normal text-[#666666]">
                /{robloxData.maxPlayers}
              </span>
            )}
          </p>
        </div>
        <div className="rd-card p-4">
          <p className="rd-label">Uptime</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {formatUptime(server.startedAt, now)}
          </p>
        </div>
        <div className="rd-card p-4">
          <p className="rd-label">Last heartbeat</p>
          <p className="mt-2 text-sm font-medium text-white">
            {formatRelativeTime(server.lastHeartbeatAt, now)}
          </p>
        </div>
      </div>

      {/* Roblox performance data */}
      {robloxData && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rd-card p-4">
            <p className="rd-label">FPS</p>
            <p className={`mt-2 text-2xl font-bold ${robloxData.fps >= 55 ? "text-[#4ade80]" : robloxData.fps >= 40 ? "text-[#fbbf24]" : "text-[#f87171]"}`}>
              {Math.round(robloxData.fps * 10) / 10}
            </p>
          </div>
          <div className="rd-card p-4">
            <p className="rd-label">Ping</p>
            <p className={`mt-2 text-2xl font-bold ${robloxData.ping <= 100 ? "text-[#4ade80]" : robloxData.ping <= 200 ? "text-[#fbbf24]" : "text-[#f87171]"}`}>
              {Math.round(robloxData.ping)}ms
            </p>
          </div>
          <div className="rd-card p-4">
            <p className="rd-label">Fill rate</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {robloxData.maxPlayers > 0
                ? `${Math.round((robloxData.playing / robloxData.maxPlayers) * 100)}%`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {server.placeId && (
        <div className="rd-card mb-6 p-4 text-sm text-[#9ca3af]">
          Place ID: <span className="font-mono text-white">{server.placeId}</span>
          {" · "}Started: <span className="text-white">{formatDateTime(server.startedAt)}</span>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Left: Players on this server */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">
              Players on this server ({players.length})
            </h2>
          </div>

          {players.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-12 text-center">
              <p className="text-sm text-[#666666]">
                No tracked players currently on this server.
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
                        Last seen
                      </th>
                      <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                        Notes
                      </th>
                      <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                        Sanctions
                      </th>
                      <th className="border-b border-[#2a2a2a] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player) => {
                      const thumbUrl = thumbnails.get(player.robloxId)
                      return (
                        <tr key={player.id} className="hover:bg-[#1d1d1d]/60">
                          <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                            <div className="flex items-center gap-3">
                              {thumbUrl ? (
                                <img
                                  src={thumbUrl}
                                  alt=""
                                  width={32}
                                  height={32}
                                  className="h-8 w-8 shrink-0 rounded-full"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a2a2a] text-xs font-bold text-[#666666]">
                                  ?
                                </div>
                              )}
                              <div>
                                <Link
                                  href={`/dashboard/players/${encodeURIComponent(player.robloxId)}`}
                                  className="font-medium text-white transition hover:text-[#fdba74]"
                                >
                                  {player.displayName || player.username || "Unknown"}
                                </Link>
                                <p className="mt-0.5 text-xs text-[#666666]">
                                  @{player.username ?? "unknown"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                            {player.robloxId}
                          </td>
                          <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                            {formatRelativeTime(player.lastSeenAt, now)}
                          </td>
                          <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                            <span className="rd-pill">{player._count.notes}</span>
                          </td>
                          <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                            <span className="rd-pill">{player._count.sanctions}</span>
                          </td>
                          <td className="border-b border-[#2a2a2a] px-4 py-3 text-right align-top">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/players/${encodeURIComponent(player.robloxId)}`}
                                className="text-xs font-medium text-[#e8822a] transition hover:text-[#f1913f]"
                              >
                                Profile
                              </Link>
                              <ServerPlayerActions robloxId={player.robloxId} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="space-y-6">
          {/* Admin server actions */}
          {isAdmin && (
            <ServerActions gameId={currentGame.id} jobId={jobId} />
          )}

          {/* Recent activity */}
          <section className="rd-card p-5">
            <h2 className="text-base font-semibold text-white">Recent activity</h2>
            <p className="mt-1 text-xs text-[#666666]">
              Latest events on this server
            </p>

            {recentLogs.length === 0 ? (
              <p className="mt-4 text-sm text-[#555555]">No events yet.</p>
            ) : (
              <ul className="mt-4 space-y-0">
                {recentLogs.map((log, i) => (
                  <li
                    key={log.id}
                    className="flex items-start gap-3 py-2.5"
                    style={{
                      borderBottom:
                        i < recentLogs.length - 1
                          ? "1px solid #242424"
                          : "none",
                    }}
                  >
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background:
                          log.event === "player_join"
                            ? "#4ade80"
                            : log.event === "player_leave"
                              ? "#9ca3af"
                              : log.event === "server_started"
                                ? "#e8822a"
                                : "#555555",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">
                        {log.event === "player_join"
                          ? "Player joined"
                          : log.event === "player_leave"
                            ? "Player left"
                            : log.event === "server_started"
                              ? "Server started"
                              : log.event}
                      </p>
                      {log.robloxId && (
                        <Link
                          href={`/dashboard/players/${encodeURIComponent(log.robloxId)}`}
                          className="text-xs text-[#e8822a] transition hover:text-[#f1913f]"
                        >
                          {log.robloxId}
                        </Link>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-[#555555]">
                      {formatRelativeTime(log.createdAt, now)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Player IDs from heartbeat */}
          {server.lastPlayerIds.length > 0 && (
            <section className="rd-card p-5">
              <h2 className="text-base font-semibold text-white">
                Player IDs ({server.lastPlayerIds.length})
              </h2>
              <p className="mt-1 text-xs text-[#666666]">
                Roblox IDs reported in the last heartbeat
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {server.lastPlayerIds.map((pid) => (
                  <Link
                    key={pid}
                    href={`/dashboard/players/${encodeURIComponent(pid)}`}
                    className="rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1.5 text-xs font-mono text-[#9ca3af] transition hover:border-[rgba(232,130,42,0.35)] hover:text-white"
                  >
                    {pid}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
