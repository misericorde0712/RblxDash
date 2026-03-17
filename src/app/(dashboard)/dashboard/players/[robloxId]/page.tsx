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

function getEventBadgeClassName(event: string) {
  if (event === "moderation_applied") {
    return "border-green-900 bg-green-950/70 text-green-200"
  }

  if (event === "moderation_failed") {
    return "border-red-900 bg-red-950/70 text-red-200"
  }

  if (event.includes("join")) {
    return "border-green-900 bg-green-950/70 text-green-200"
  }

  if (event.includes("leave")) {
    return "border-yellow-900 bg-yellow-950/70 text-yellow-200"
  }

  if (event.includes("action")) {
    return "border-blue-900 bg-blue-950/70 text-blue-200"
  }

  return "border-gray-700 bg-gray-950 text-gray-300"
}

function formatJobId(jobId: string | null) {
  if (!jobId) {
    return "No live server"
  }

  if (jobId.startsWith("studio-")) {
    return "Studio"
  }

  return jobId
}

function formatReason(reason: string | null) {
  if (!reason || reason.trim() === "") {
    return "No reason provided"
  }

  return reason
}

function getDeliveryClassName(status: "PENDING" | "APPLIED" | "FAILED") {
  if (status === "APPLIED") {
    return "border-green-900 bg-green-950/60 text-green-200"
  }

  if (status === "FAILED") {
    return "border-red-900 bg-red-950/60 text-red-200"
  }

  return "border-yellow-900 bg-yellow-950/60 text-yellow-200"
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
          <p className="mt-1 text-sm text-gray-400">
            Select a game before opening a player profile.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-white">
            No active game selected
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Pick a game from the sidebar, then open this player again from
            Players or Logs.
          </p>
          <Link
            href="/dashboard/players"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
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
      <div className="mb-6">
        <Link
          href="/dashboard/players"
          className="mb-2 inline-block text-sm text-gray-500 transition hover:text-gray-300"
        >
          ← Back to players
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {player.displayName || player.username || "Unknown player"}
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              @{player.username ?? "unknown"} · Roblox ID {player.robloxId} ·{" "}
              {currentGame.name} in {org.name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/logs?q=${encodeURIComponent(player.robloxId)}`}
              className="rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-800"
            >
              Open in logs
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Online now
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {player.isOnline ? "Online" : "Offline"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Current server
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatJobId(player.currentServerJobId)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Last seen
          </p>
          <p className="mt-2 text-sm font-semibold text-white">
            {formatDateTime(player.lastSeenAt)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total events
          </p>
          <p className="mt-2 text-3xl font-bold text-white">{totalEvents}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-base font-semibold text-white">Profile</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Display name
                </p>
                <p className="mt-1 text-sm text-gray-200">
                  {player.displayName ?? "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Username
                </p>
                <p className="mt-1 text-sm text-gray-200">
                  @{player.username ?? "unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Roblox ID
                </p>
                <p className="mt-1 text-sm text-gray-200">{player.robloxId}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  First seen
                </p>
                <p className="mt-1 text-sm text-gray-200">
                  {formatDateTime(player.firstSeenAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Team notes
                </p>
                <p className="mt-1 text-sm text-gray-200">{player._count.notes}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Session started
                </p>
                <p className="mt-1 text-sm text-gray-200">
                  {player.lastSessionStartedAt
                    ? formatDateTime(player.lastSessionStartedAt)
                    : "Unknown"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Session ended
                </p>
                <p className="mt-1 text-sm text-gray-200">
                  {player.lastSessionEndedAt
                    ? formatDateTime(player.lastSessionEndedAt)
                    : player.isOnline
                      ? "Still online"
                      : "Unknown"}
                </p>
              </div>
            </div>

            {currentServer ? (
              <div className="mt-4 rounded-xl border border-gray-800 bg-gray-950/70 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Live server heartbeat
                </p>
                <div className="mt-3 grid gap-3 text-sm text-gray-300 sm:grid-cols-3">
                  <p>Job {formatJobId(currentServer.jobId)}</p>
                  <p>Players {currentServer.lastPlayerCount}</p>
                  <p>Heartbeat {formatDateTime(currentServer.lastHeartbeatAt)}</p>
                </div>
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Recent activity
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Latest webhook events received for this player.
                </p>
              </div>
              <Link
                href={`/dashboard/logs?q=${encodeURIComponent(player.robloxId)}`}
                className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
              >
                View all logs
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-500">
                No webhook events recorded for this player yet.
              </p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  (() => {
                    const eventDisplay = getGameLogEventDisplay(log.event, log.payload)

                    return (
                      <div
                        key={log.id}
                        className="rounded-xl border border-gray-800 bg-gray-950/70 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getEventBadgeClassName(
                              eventDisplay.key
                            )}`}
                          >
                            {eventDisplay.label}
                          </span>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(log.createdAt)}
                          </p>
                        </div>

                        <p className="mt-3 text-sm text-gray-300">
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
                          className="mt-3 inline-flex text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
                        >
                          Open log details
                        </Link>
                      </div>
                    )
                  })()
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <h2 className="text-base font-semibold text-white">Current state</h2>
            <div className="mt-4 space-y-3">
              {activeSanctions.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No active restrictions for this player.
                </p>
              ) : (
                activeSanctions.map((sanction) => (
                  <div
                    key={sanction.id}
                    className="rounded-xl border border-red-900 bg-red-950/40 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-red-800 px-2.5 py-1 text-xs text-red-200">
                        {formatSanctionType(sanction.type)}
                      </span>
                      <span className="rounded-full border border-red-800 px-2.5 py-1 text-xs text-red-200">
                        {formatSanctionWindow({
                          type: sanction.type,
                          createdAt: sanction.createdAt,
                          expiresAt: sanction.expiresAt,
                        })}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${getDeliveryClassName(
                          sanction.deliveryStatus
                        )}`}
                      >
                        {formatSanctionDeliveryStatus(sanction.deliveryStatus)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-red-100">
                      {formatReason(sanction.reason)}
                    </p>
                    {sanction.deliveryDetails ? (
                      <p className="mt-2 text-xs text-red-200">
                        {sanction.deliveryDetails}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

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
