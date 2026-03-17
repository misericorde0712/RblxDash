import Link from "next/link"
import { requireCurrentOrg } from "@/lib/auth"
import { hasRequiredRole } from "@/lib/org-members"
import { OrgRole } from "@prisma/client"
import { cleanupStaleLivePresence, getLiveServerCutoff } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import { fetchAllPublicServers, type RobloxPublicServer } from "@/lib/roblox-servers"
import ServerBroadcastForm from "./server-broadcast-form"

function formatUptime(startedAt: Date, now: Date) {
  const diffMs = now.getTime() - startedAt.getTime()
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function formatRelativeTime(date: Date, now: Date) {
  const diffMs = now.getTime() - date.getTime()
  const seconds = Math.floor(diffMs / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

function formatJobId(jobId: string) {
  if (jobId.startsWith("studio-")) {
    return "Studio"
  }
  return jobId.slice(0, 12)
}

export default async function ServersPage() {
  const { org, currentGame, member } = await requireCurrentOrg()
  const isAdmin = hasRequiredRole(member.role, OrgRole.ADMIN)

  if (!currentGame) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Live game servers appear here once you select a game.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-white">
            No active game selected
          </h2>
          <p className="mt-2 text-sm text-[#666666]">
            Pick a game from the sidebar or connect one from the Games page.
          </p>
          <Link href="/dashboard/games" className="rd-button-primary mt-6">
            Open games
          </Link>
        </div>
      </div>
    )
  }

  const now = new Date()
  const liveCutoff = getLiveServerCutoff(now)
  await cleanupStaleLivePresence(prisma, { gameId: currentGame.id })

  // Fetch game for universeId
  const game = await prisma.game.findUnique({
    where: { id: currentGame.id },
    select: { robloxUniverseId: true },
  })

  const [servers, totalPlayersOnline, robloxServers] = await Promise.all([
    prisma.liveServer.findMany({
      where: {
        gameId: currentGame.id,
        lastHeartbeatAt: { gte: liveCutoff },
      },
      orderBy: { lastPlayerCount: "desc" },
    }),
    prisma.trackedPlayer.count({
      where: {
        gameId: currentGame.id,
        isOnline: true,
      },
    }),
    game?.robloxUniverseId
      ? fetchAllPublicServers(game.robloxUniverseId)
      : Promise.resolve([] as RobloxPublicServer[]),
  ])

  // Build a map of Roblox API data by jobId
  const robloxDataMap = new Map(
    robloxServers.map((rs) => [rs.id, rs])
  )

  const totalServers = servers.length
  const totalServerPlayers = servers.reduce((sum, s) => sum + s.lastPlayerCount, 0)
  const regions = [...new Set(servers.map((s) => s.region).filter(Boolean))]

  return (
    <div className="rd-page-enter p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Servers</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Live game servers for {currentGame.name} in {org.name}.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="rd-card mb-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="rd-label">Active servers</p>
            <p className="mt-2 text-3xl font-bold text-white">{totalServers}</p>
          </div>
          <div>
            <p className="rd-label">Players in servers</p>
            <p className="mt-2 text-3xl font-bold text-white">{totalServerPlayers}</p>
          </div>
          <div>
            <p className="rd-label">Players online</p>
            <p className="mt-2 text-3xl font-bold text-white">{totalPlayersOnline}</p>
          </div>
          <div>
            <p className="rd-label">Regions</p>
            <p className="mt-2 text-3xl font-bold text-white">{regions.length}</p>
          </div>
        </div>
      </div>

      {/* Broadcast form (admin only) */}
      {isAdmin && (
        <ServerBroadcastForm gameId={currentGame.id} />
      )}

      <div className="rd-card mb-6 p-4 text-sm text-[#9ca3af]">
        Server data combines webhook heartbeats with the Roblox public API.
        {robloxServers.length > 0
          ? ` FPS and ping data available for ${robloxServers.length} server(s) from Roblox.`
          : game?.robloxUniverseId
            ? " Roblox API data unavailable — the game may be private or offline."
            : " Configure a Universe ID on the game to enable FPS and ping data from Roblox."}
      </div>

      {/* Region breakdown */}
      {regions.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {regions.map((region) => {
            const count = servers.filter((s) => s.region === region).length
            return (
              <span
                key={region}
                className="rd-pill border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]"
              >
                {region} ({count})
              </span>
            )
          })}
        </div>
      )}

      {/* Servers table */}
      {servers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(232,130,42,0.1)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
              <path d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">No active servers</h2>
          <p className="mt-2 max-w-sm mx-auto text-sm text-[#666666]">
            Servers appear when your game sends heartbeat events. Open your Roblox game in Studio or join it to start seeing live server data.
          </p>
          <a href="/dashboard/games" className="mt-4 inline-block rounded-lg px-4 py-2 text-xs font-medium" style={{ background: "rgba(232,130,42,0.1)", color: "#e8822a" }}>
            Check game setup
          </a>
        </div>
      ) : (
        <div className="rd-table-shell overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-300">
              <thead>
                <tr>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Server
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Region
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Players
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    FPS
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Ping
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Uptime
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Status
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-right text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => {
                  const heartbeatAge = Math.floor(
                    (now.getTime() - server.lastHeartbeatAt.getTime()) / 1000
                  )
                  const isHealthy = heartbeatAge < 45
                  const isWarning = heartbeatAge >= 45 && heartbeatAge < 75
                  const robloxData = robloxDataMap.get(server.jobId)

                  return (
                    <tr key={server.id} className="hover:bg-[#1d1d1d]/60">
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                        <div>
                          <p className="font-medium text-white">
                            {formatJobId(server.jobId)}
                          </p>
                          <p className="mt-1 text-xs text-[#666666]">
                            {server.placeId ?? "No place ID"}
                          </p>
                        </div>
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                        {server.region ?? "Unknown"}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                        <span className="text-white font-medium">
                          {server.lastPlayerCount}
                        </span>
                        {robloxData && (
                          <span className="text-[#666666]">
                            /{robloxData.maxPlayers}
                          </span>
                        )}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                        {robloxData ? (
                          <span className={robloxData.fps >= 55 ? "text-[#4ade80]" : robloxData.fps >= 40 ? "text-[#fbbf24]" : "text-[#f87171]"}>
                            {Math.round(robloxData.fps * 10) / 10}
                          </span>
                        ) : (
                          <span className="text-[#444444]">—</span>
                        )}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                        {robloxData ? (
                          <span className={robloxData.ping <= 100 ? "text-[#4ade80]" : robloxData.ping <= 200 ? "text-[#fbbf24]" : "text-[#f87171]"}>
                            {Math.round(robloxData.ping)}ms
                          </span>
                        ) : (
                          <span className="text-[#444444]">—</span>
                        )}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                        {formatUptime(server.startedAt, now)}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${
                            isHealthy
                              ? "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
                              : isWarning
                                ? "border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.08)] text-[#fde68a]"
                                : "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]"
                          }`}
                        >
                          {isHealthy ? "Healthy" : isWarning ? "Slow" : "Stale"}
                        </span>
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 text-right align-top">
                        <Link
                          href={`/dashboard/servers/${encodeURIComponent(server.jobId)}`}
                          className="text-xs font-medium text-[#e8822a] transition hover:text-[#f1913f]"
                        >
                          View →
                        </Link>
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
  )
}
