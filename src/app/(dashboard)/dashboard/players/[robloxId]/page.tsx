import Link from "next/link"
import { notFound } from "next/navigation"
import PayloadDetails from "@/components/payload-details"
import { requireCurrentOrg } from "@/lib/auth"
import { cleanupStaleLivePresence } from "@/lib/live-presence"
import { getGameLogEventDisplay } from "@/lib/game-log-events"
import {
  formatSanctionDeliveryStatus,
  formatSanctionType,
  formatSanctionWindow,
  isSanctionCurrentlyActive,
} from "@/lib/player-moderation"
import { prisma } from "@/lib/prisma"
import PlayerDetailPanel from "./player-detail-panel"
import PlayerInventorySection from "./player-inventory-section"

function formatDateTime(value: Date) {
  return value.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getEventBadgeStyle(event: string): { background: string; border: string; color: string } {
  if (event === "moderation_applied" || event.includes("join")) {
    return { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#86efac" }
  }
  if (event === "moderation_failed") {
    return { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }
  }
  if (event.includes("leave")) {
    return { background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", color: "#fde68a" }
  }
  if (event.includes("action")) {
    return { background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#93c5fd" }
  }
  return { background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.15)", color: "#9ca3af" }
}

function formatJobId(jobId: string | null) {
  if (!jobId) return "No live server"
  if (jobId.startsWith("studio-")) return "Studio"
  return jobId
}

function formatReason(reason: string | null) {
  if (!reason || reason.trim() === "") return "No reason provided"
  return reason
}

function getDeliveryStyle(status: "PENDING" | "APPLIED" | "FAILED"): { background: string; border: string; color: string } {
  if (status === "APPLIED") {
    return { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#86efac" }
  }
  if (status === "FAILED") {
    return { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }
  }
  return { background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", color: "#fde68a" }
}

export default async function PlayerDetailsPage({
  params,
}: {
  params: Promise<{ robloxId: string }>
}) {
  const { robloxId } = await params
  const { org, currentGame } = await requireCurrentOrg()

  if (!currentGame) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Player details</h1>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Select a game before opening a player profile.
          </p>
        </div>

        <div className="rounded-xl border border-dashed px-6 py-12 text-center" style={{ borderColor: "#3a3a3a", background: "#222222" }}>
          <h2 className="text-base font-semibold text-white">No active game selected</h2>
          <p className="mt-2 text-sm" style={{ color: "#666666" }}>
            Pick a game from the sidebar, then open this player again from Players or Logs.
          </p>
          <Link
            href="/dashboard/players"
            className="mt-6 inline-flex rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
            style={{ background: "#e8822a" }}
          >
            Open players
          </Link>
        </div>
      </div>
    )
  }

  await cleanupStaleLivePresence(prisma, { gameId: currentGame.id })

  const gameDetails = await prisma.game.findUnique({
    where: { id: currentGame.id },
    select: { robloxUniverseId: true },
  })

  const [player, recentLogs, notes, sanctions, totalEvents] = await Promise.all([
    prisma.trackedPlayer.findUnique({
      where: {
        gameId_robloxId: {
          gameId: currentGame.id,
          robloxId,
        },
      },
      include: {
        _count: {
          select: {
            notes: true,
            sanctions: true,
          },
        },
      },
    }),
    prisma.gameLog.findMany({
      where: {
        gameId: currentGame.id,
        robloxId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      select: {
        id: true,
        event: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.playerNote.findMany({
      where: {
        gameId: currentGame.id,
        robloxId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
      },
    }),
    prisma.sanction.findMany({
      where: {
        gameId: currentGame.id,
        robloxId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
      select: {
        id: true,
        type: true,
        reason: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        moderator: true,
        deliveryStatus: true,
        deliveredAt: true,
        deliveryDetails: true,
      },
    }),
    prisma.gameLog.count({
      where: {
        gameId: currentGame.id,
        robloxId,
      },
    }),
  ])

  if (!player) {
    notFound()
  }

  const currentServer = player.currentServerJobId
    ? await prisma.liveServer.findUnique({
        where: {
          gameId_jobId: {
            gameId: currentGame.id,
            jobId: player.currentServerJobId,
          },
        },
        select: {
          jobId: true,
          placeId: true,
          lastHeartbeatAt: true,
          lastPlayerCount: true,
        },
      })
    : null

  const noteAuthorIds = Array.from(new Set(notes.map((note) => note.authorId)))
  const noteAuthors =
    noteAuthorIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: {
            id: {
              in: noteAuthorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
  const authorById = new Map(
    noteAuthors.map((author) => [author.id, author.name?.trim() || author.email])
  )

  const noteItems = notes.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.createdAt.toISOString(),
    authorLabel: authorById.get(note.authorId) ?? "Unknown author",
  }))
  const sanctionItems = sanctions.map((sanction) => ({
    id: sanction.id,
    type: sanction.type,
    reason: sanction.reason,
    active: sanction.active,
    createdAt: sanction.createdAt.toISOString(),
    updatedAt: sanction.updatedAt.toISOString(),
    expiresAt: sanction.expiresAt?.toISOString() ?? null,
    moderator: sanction.moderator,
    deliveryStatus: sanction.deliveryStatus,
    deliveredAt: sanction.deliveredAt?.toISOString() ?? null,
    deliveryDetails: sanction.deliveryDetails,
  }))
  const activeSanctions = sanctions.filter((sanction) =>
    isSanctionCurrentlyActive(sanction)
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/players"
          className="mb-2 inline-block text-sm transition"
          style={{ color: "#666666" }}
        >
          ← Back to players
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {player.displayName || player.username || "Unknown player"}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
              @{player.username ?? "unknown"} · Roblox ID {player.robloxId} ·{" "}
              {currentGame.name} in {org.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/logs?q=${encodeURIComponent(player.robloxId)}`}
              className="rounded-xl px-3 py-2 text-sm transition"
              style={{ border: "1px solid #2a2a2a", color: "#9ca3af" }}
            >
              Open in logs
            </Link>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rd-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
            Online now
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {player.isOnline ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#4ade80" }} />
                Online
              </span>
            ) : "Offline"}
          </p>
        </div>
        <div className="rd-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
            Current server
          </p>
          <p className="mt-2 text-sm font-semibold text-white truncate">
            {formatJobId(player.currentServerJobId)}
          </p>
        </div>
        <div className="rd-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
            Last seen
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatDateTime(player.lastSeenAt)}
          </p>
        </div>
        <div className="rd-card p-5">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
            Total events
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{totalEvents}</p>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {/* Profile section */}
          <section className="rd-card p-5">
            <h2 className="text-base font-semibold text-white">Profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Display name
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>
                  {player.displayName ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Username
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>
                  @{player.username ?? "unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Roblox ID
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>{player.robloxId}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  First seen
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>
                  {formatDateTime(player.firstSeenAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Team notes
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>{player._count.notes}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Session started
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>
                  {player.lastSessionStartedAt
                    ? formatDateTime(player.lastSessionStartedAt)
                    : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Session ended
                </p>
                <p className="mt-1 text-sm" style={{ color: "#d1d5db" }}>
                  {player.lastSessionEndedAt
                    ? formatDateTime(player.lastSessionEndedAt)
                    : player.isOnline
                      ? "Still online"
                      : "Unknown"}
                </p>
              </div>
            </div>

            {currentServer ? (
              <div className="mt-4 rounded-xl p-4" style={{ background: "#191919", border: "1px solid #2a2a2a" }}>
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "#666666" }}>
                  Live server heartbeat
                </p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3" style={{ color: "#9ca3af" }}>
                  <p>Job {formatJobId(currentServer.jobId)}</p>
                  <p>Players {currentServer.lastPlayerCount}</p>
                  <p>Heartbeat {formatDateTime(currentServer.lastHeartbeatAt)}</p>
                </div>
              </div>
            ) : null}
          </section>

          {/* Recent activity */}
          <section className="rd-card p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">Recent activity</h2>
                <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                  Latest webhook events received for this player.
                </p>
              </div>
              <Link
                href={`/dashboard/logs?q=${encodeURIComponent(player.robloxId)}`}
                className="text-sm font-medium transition"
                style={{ color: "#e8822a" }}
              >
                View all logs
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-sm" style={{ color: "#666666" }}>
                No webhook events recorded for this player yet.
              </p>
            ) : (
              <div className="rd-scrollable-list space-y-3">
                {recentLogs.map((log) => {
                  const eventDisplay = getGameLogEventDisplay(log.event, log.payload)
                  const badgeStyle = getEventBadgeStyle(eventDisplay.key)

                  return (
                    <div
                      key={log.id}
                      className="rounded-xl p-4"
                      style={{ background: "#191919", border: "1px solid #2a2a2a" }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs font-medium"
                          style={badgeStyle}
                        >
                          {eventDisplay.label}
                        </span>
                        <p className="text-xs" style={{ color: "#666666" }}>
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>

                      <p className="mt-3 text-sm" style={{ color: "#9ca3af" }}>
                        {eventDisplay.summary || "No summary available for this event."}
                      </p>

                      <div className="mt-3">
                        <PayloadDetails
                          payload={log.payload}
                          collapsedLabel="Show payload details"
                        />
                      </div>

                      <Link
                        href={`/dashboard/logs?q=${encodeURIComponent(player.robloxId)}&logId=${log.id}`}
                        className="mt-3 inline-flex text-xs font-medium transition"
                        style={{ color: "#e8822a" }}
                      >
                        Open log details
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Current state (active sanctions) */}
          <section className="rd-card p-5">
            <h2 className="text-base font-semibold text-white">Current state</h2>
            <div className="mt-4 space-y-3">
              {activeSanctions.length === 0 ? (
                <p className="text-sm" style={{ color: "#666666" }}>
                  No active restrictions for this player.
                </p>
              ) : (
                activeSanctions.map((sanction) => {
                  const deliveryStyle = getDeliveryStyle(sanction.deliveryStatus)

                  return (
                    <div
                      key={sanction.id}
                      className="rounded-xl p-4"
                      style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}
                        >
                          {formatSanctionType(sanction.type)}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}
                        >
                          {formatSanctionWindow({
                            type: sanction.type,
                            createdAt: sanction.createdAt,
                            expiresAt: sanction.expiresAt,
                          })}
                        </span>
                        <span
                          className="rounded-full px-2.5 py-1 text-xs"
                          style={deliveryStyle}
                        >
                          {formatSanctionDeliveryStatus(sanction.deliveryStatus)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm" style={{ color: "#fca5a5" }}>
                        {formatReason(sanction.reason)}
                      </p>
                      {sanction.deliveryDetails ? (
                        <p className="mt-2 text-xs" style={{ color: "#f87171" }}>
                          {sanction.deliveryDetails}
                        </p>
                      ) : null}
                    </div>
                  )
                })
              )}
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <PlayerInventorySection
            robloxId={player.robloxId}
            hasUniverseId={Boolean(gameDetails?.robloxUniverseId)}
          />
          <PlayerDetailPanel
            robloxId={player.robloxId}
            notes={noteItems}
            sanctions={sanctionItems}
          />
        </div>
      </div>
    </div>
  )
}
