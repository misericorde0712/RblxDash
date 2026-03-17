import Link from "next/link"
import { requireCurrentOrg } from "@/lib/auth"
import { cleanupStaleLivePresence, getLiveServerCutoff } from "@/lib/live-presence"
import {
  formatSanctionDeliveryStatus,
  formatSanctionType,
  formatSanctionWindow,
  isSanctionCurrentlyActive,
} from "@/lib/player-moderation"
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

export default async function ModerationPage() {
  const { org, currentGame } = await requireCurrentOrg()

  if (!currentGame) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Moderation</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Moderation tools appear here once you select a game.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-white">
            No active game selected
          </h2>
          <p className="mt-2 text-sm text-[#666666]">
            Pick a game from the sidebar, then open a player profile to create
            notes or sanctions.
          </p>
          <Link
            href="/dashboard/players"
            className="rd-button-primary mt-6"
          >
            Open players
          </Link>
        </div>
      </div>
    )
  }

  const twentyFourHoursAgo = getTwentyFourHoursAgo()
  const liveCutoff = getLiveServerCutoff()
  await cleanupStaleLivePresence(prisma, { gameId: currentGame.id })

  const [currentSanctions, recentSanctions, onlinePlayersNow, liveServersNow, pendingAcks] =
    await Promise.all([
      prisma.sanction.findMany({
        where: {
          gameId: currentGame.id,
          active: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          robloxId: true,
          type: true,
          reason: true,
          active: true,
          createdAt: true,
          expiresAt: true,
          moderator: true,
          deliveryStatus: true,
          deliveredAt: true,
          deliveryDetails: true,
          player: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
      }),
      prisma.sanction.findMany({
        where: {
          gameId: currentGame.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 40,
        select: {
          id: true,
          robloxId: true,
          type: true,
          reason: true,
          active: true,
          createdAt: true,
          expiresAt: true,
          moderator: true,
          deliveryStatus: true,
          deliveredAt: true,
          deliveryDetails: true,
          player: {
            select: {
              displayName: true,
              username: true,
            },
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
      prisma.sanction.count({
        where: {
          gameId: currentGame.id,
          active: true,
          deliveryStatus: "PENDING",
        },
      }),
    ])

  const activeSanctions = currentSanctions.filter((sanction) =>
    isSanctionCurrentlyActive(sanction)
  )
  const actions24h = recentSanctions.filter(
    (sanction) => sanction.createdAt.getTime() >= twentyFourHoursAgo.getTime()
  ).length

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Moderation</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Live moderation state for {currentGame.name} in {org.name}.
        </p>
      </div>

      <div className="rd-banner rd-banner-info mb-6">
        Open a player profile from{" "}
        <Link
          href="/dashboard/players"
          className="font-medium text-white underline"
        >
          Players
        </Link>{" "}
        or{" "}
        <Link
          href="/dashboard/logs"
          className="font-medium text-white underline"
        >
          Logs
        </Link>{" "}
        to create notes, kicks, timeouts, bans, or unbans. The latest Luau
        script now sends server heartbeats and moderation acknowledgements back
        to Dashblox.
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rd-card p-5">
          <p className="rd-label">Active restrictions</p>
          <p className="mt-2 text-3xl font-bold text-white">
            {activeSanctions.length}
          </p>
        </div>
        <div className="rd-card p-5">
          <p className="rd-label">Pending acks</p>
          <p className="mt-2 text-3xl font-bold text-white">{pendingAcks}</p>
        </div>
        <div className="rd-card p-5">
          <p className="rd-label">Live servers</p>
          <p className="mt-2 text-3xl font-bold text-white">{liveServersNow}</p>
        </div>
        <div className="rd-card p-5">
          <p className="rd-label">Online players</p>
          <p className="mt-2 text-3xl font-bold text-white">{onlinePlayersNow}</p>
        </div>
      </div>

      <div className="rd-card mb-6 p-4 text-sm text-[#9ca3af]">
        {actions24h > 0
          ? `${actions24h} moderation actions were created in the last 24 hours.`
          : "No moderation actions were created in the last 24 hours."}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Active now</h2>
          <div className="mt-4 space-y-3">
            {activeSanctions.length === 0 ? (
              <p className="text-sm text-[#666666]">
                No active kicks, timeouts, or bans for this game.
              </p>
            ) : (
              activeSanctions.map((sanction) => (
                <Link
                  key={sanction.id}
                  href={`/dashboard/players/${encodeURIComponent(sanction.robloxId)}`}
                  className="block rounded-xl border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] p-4 transition hover:bg-[rgba(248,113,113,0.12)]"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rd-pill border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]">
                      {formatSanctionType(sanction.type)}
                    </span>
                    <span className="rd-pill border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]">
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
                  <p className="mt-3 text-sm font-medium text-white">
                    {sanction.player?.displayName ||
                      sanction.player?.username ||
                      sanction.robloxId}
                  </p>
                  <p className="mt-1 text-xs text-[#fecaca]">
                    {formatReason(sanction.reason)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Recent history</h2>
          <div className="mt-4 space-y-3">
            {recentSanctions.length === 0 ? (
              <p className="text-sm text-[#666666]">
                No moderation actions recorded for this game yet.
              </p>
            ) : (
              recentSanctions.map((sanction) => (
                <div
                  key={sanction.id}
                  className="rd-card-muted p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rd-pill">
                        {formatSanctionType(sanction.type)}
                      </span>
                      <span className="text-xs text-[#666666]">
                        {isSanctionCurrentlyActive(sanction) ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${getDeliveryClassName(
                          sanction.deliveryStatus
                        )}`}
                      >
                        {formatSanctionDeliveryStatus(sanction.deliveryStatus)}
                      </span>
                    </div>
                    <p className="text-xs text-[#666666]">
                      {formatDateTime(sanction.createdAt)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm text-[#e5e7eb]">
                    {formatReason(sanction.reason)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#666666]">
                    <span>
                      {sanction.player?.displayName ||
                        sanction.player?.username ||
                        sanction.robloxId}
                    </span>
                    <span>By {sanction.moderator}</span>
                    <span>
                      {sanction.deliveredAt
                        ? `Ack ${formatDateTime(sanction.deliveredAt)}`
                        : "Ack pending"}
                    </span>
                    <Link
                      href={`/dashboard/players/${encodeURIComponent(sanction.robloxId)}`}
                      className="font-medium text-[#e8822a] transition hover:text-[#f1913f]"
                    >
                      Open player
                    </Link>
                  </div>
                  {sanction.deliveryDetails ? (
                    <p className="mt-3 text-xs text-[#fecaca]">
                      {sanction.deliveryDetails}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
