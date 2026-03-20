import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { OrgRole } from "@prisma/client"
import {
  HealthBadge,
  MetricCard,
} from "../../_components/game-hub-ui"
import { SetupValidatorCard } from "../../_components/setup-validator-card"
import { hasRequiredRole, requireCurrentOrg } from "@/lib/auth"
import {
  formatCount,
  formatDate,
  formatRelativeTime,
  getGameHealth,
} from "@/lib/game-hub"
import { getGameLogEventDisplay } from "@/lib/game-log-events"
import { getGameSetupValidator } from "@/lib/game-monitoring"
import { getLiveServerCutoff } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import CopyButton from "../copy-button"
import DeleteGameButton from "./delete-game-button"

export default async function GameDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { gameId } = await params
  const { dbUser, member, currentGame } = await requireCurrentOrg()
  const resolvedSearchParams = (await searchParams) ?? {}
  const rotated = resolvedSearchParams.rotated === "1"
  const setup = resolvedSearchParams.setup === "1"

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      org: {
        members: {
          some: {
            userId: dbUser.id,
          },
        },
      },
    },
    include: {
      org: {
        select: {
          id: true,
          name: true,
        },
      },
      robloxConnection: {
        select: {
          robloxUserId: true,
          robloxUsername: true,
          robloxDisplayName: true,
        },
      },
    },
  })

  if (!game) notFound()

  if (currentGame?.id !== game.id) {
    const search = new URLSearchParams({
      gameId: game.id,
      redirectTo: `/dashboard/games/${game.id}`,
    })
    redirect(`/api/games/current?${search.toString()}`)
  }

  const canManageGame = hasRequiredRole(member.role, OrgRole.ADMIN)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const webhookUrl = `${appUrl}/api/webhook/${game.id}`
  const webhookHeader = `x-webhook-secret: ${game.webhookSecret}`
  const now = new Date()
  const liveCutoff = getLiveServerCutoff(now)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const [
    liveServersNow,
    latestLiveServer,
    playersOnlineNow,
    lastEvent,
    events24h,
    eventsLast5m,
    pendingModeration,
    failedModeration24h,
  ] = await Promise.all([
    prisma.liveServer.count({
      where: {
        gameId: game.id,
        lastHeartbeatAt: {
          gte: liveCutoff,
        },
      },
    }),
    prisma.liveServer.findFirst({
      where: {
        gameId: game.id,
        lastHeartbeatAt: {
          gte: liveCutoff,
        },
      },
      orderBy: {
        lastHeartbeatAt: "desc",
      },
      select: {
        lastHeartbeatAt: true,
      },
    }),
    prisma.trackedPlayer.count({
      where: {
        gameId: game.id,
        isOnline: true,
      },
    }),
    prisma.gameLog.findFirst({
      where: {
        gameId: game.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        event: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.gameLog.count({
      where: {
        gameId: game.id,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    }),
    prisma.gameLog.count({
      where: {
        gameId: game.id,
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    }),
    prisma.sanction.count({
      where: {
        gameId: game.id,
        active: true,
        deliveryStatus: "PENDING",
      },
    }),
    prisma.sanction.count({
      where: {
        gameId: game.id,
        deliveryStatus: "FAILED",
        updatedAt: {
          gte: twentyFourHoursAgo,
        },
      },
    }),
  ])
  const validator = await getGameSetupValidator(prisma, game.id)
  const health = getGameHealth({
    liveServersNow,
    eventsLast5m,
    failedModeration24h,
    pendingModeration,
    lastEventAt: lastEvent?.createdAt ?? null,
  })
  const latestEventDisplay = lastEvent
    ? getGameLogEventDisplay(lastEvent.event, lastEvent.payload)
    : null

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          href="/dashboard/games"
          className="rd-link-accent mb-2 inline-block text-sm"
        >
          ← Back to games
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{game.name}</h1>
          <HealthBadge tone={health.tone} label={health.label} />
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{ border: "1px solid #2a2a2a", background: "#222222", color: "#9ca3af" }}
          >
            {game.org.name}
          </span>
        </div>
      </div>

      {rotated ? (
        <div className="mb-6 rounded-xl border border-yellow-900 bg-yellow-950/60 px-4 py-3 text-sm text-yellow-200">
          Webhook secret rotated successfully. Update the Roblox files now.
        </div>
      ) : null}

      {setup ? (
        <div
          className="mb-6 rounded-xl px-4 py-4 text-sm"
          style={{
            border: "1px solid rgba(232,130,42,0.22)",
            background: "rgba(232,130,42,0.08)",
            color: "#e8822a",
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-white">Game created successfully.</p>
              <p className="mt-1 text-sm" style={{ color: "#f3c196" }}>
                Next: install the Dashblox files in Roblox Studio, then come
                back here and confirm the validator turns green.
              </p>
            </div>
            <Link href="/dashboard/guide" className="rd-button-primary">
              Open setup
            </Link>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
        {/* Overview */}
        <section className="rd-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">Overview</h2>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>{health.detail}</p>
            </div>
            <div className="text-right">
              <p className="rd-label">
                Latest event
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {latestEventDisplay?.label ?? "No events yet"}
              </p>
              <p className="mt-1 text-xs" style={{ color: "#666666" }}>
                {lastEvent?.createdAt
                  ? `${formatRelativeTime(lastEvent.createdAt, now)} • ${formatDate(
                      lastEvent.createdAt
                    )}`
                  : "Waiting for the first signal"}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              variant="muted"
              title="Live Servers"
              value={formatCount(liveServersNow)}
              detail={
                latestLiveServer?.lastHeartbeatAt
                  ? `Last heartbeat ${formatRelativeTime(
                      latestLiveServer.lastHeartbeatAt,
                      now
                    )}`
                  : "No active heartbeat"
              }
            />
            <MetricCard
              variant="muted"
              title="Players Online"
              value={formatCount(playersOnlineNow)}
              detail="Players currently marked online in this game."
            />
            <MetricCard
              variant="muted"
              title="Events 24h"
              value={formatCount(events24h)}
              detail={`${formatCount(eventsLast5m)} received in the last 5 minutes.`}
            />
            <MetricCard
              variant="muted"
              title="Moderation"
              value={
                failedModeration24h > 0
                  ? `${formatCount(failedModeration24h)} failed`
                  : pendingModeration > 0
                    ? `${formatCount(pendingModeration)} pending`
                    : "Healthy"
              }
              detail={
                failedModeration24h > 0
                  ? "Recent delivery failures need attention."
                  : pendingModeration > 0
                    ? "Some actions are waiting for acknowledgement."
                    : "No pending or failed deliveries right now."
              }
            />
          </div>
        </section>

        {/* Setup validator — only show when incomplete */}
        {!validator.requiredComplete && (
          <SetupValidatorCard
            items={validator.items}
            requiredComplete={validator.requiredComplete}
            completeRequiredCount={validator.completeRequiredItems.length}
            requiredCount={validator.requiredItems.length}
            totalComplete={validator.totalComplete}
            totalCount={validator.totalCount}
            compact
          />
        )}

        {/* Connection */}
        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Connection</h2>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Credentials used by the Roblox script to communicate with the dashboard.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <p className="rd-label mb-1">Webhook URL</p>
              <div className="flex gap-2">
                <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border px-3 py-2 text-gray-100" style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}>
                  {webhookUrl}
                </code>
                <CopyButton value={webhookUrl} />
              </div>
            </div>

            <div>
              <p className="rd-label mb-1">Secret header</p>
              <div className="flex gap-2">
                <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border px-3 py-2 text-gray-100" style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}>
                  {webhookHeader}
                </code>
                <CopyButton value={webhookHeader} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs" style={{ color: "#666666" }}>
              <span>Place ID: <strong className="text-white">{game.robloxPlaceId}</strong></span>
              <span>Universe ID: <strong className="text-white">{game.robloxUniverseId ?? "Not set"}</strong></span>
              <span>Roblox auth: <strong className="text-white">
                {game.robloxConnection
                  ? game.robloxConnection.robloxDisplayName ||
                    game.robloxConnection.robloxUsername ||
                    game.robloxConnection.robloxUserId
                  : "Manual only"}
              </strong></span>
              <span>Created: <strong className="text-white">{formatDate(game.createdAt)}</strong></span>
            </div>

            {canManageGame && (
              <form action={`/api/games/${game.id}/rotate-secret`} method="POST">
                <button
                  type="submit"
                  className="rounded-lg border border-yellow-800 bg-yellow-950 px-3 py-2 text-xs font-medium text-yellow-200 transition hover:bg-yellow-900"
                >
                  Rotate secret
                </button>
              </form>
            )}
          </div>
        </section>

        {/* Danger zone */}
        {hasRequiredRole(member.role, OrgRole.ADMIN) && (
          <section
            className="rounded-2xl p-5"
            style={{ background: "#1e1e1e", border: "1px solid rgba(248,113,113,0.15)" }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.15em]" style={{ color: "#f87171" }}>
              Danger zone
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white">Delete this game</p>
                <p className="mt-0.5 text-sm" style={{ color: "#666" }}>
                  Permanently removes all servers, players, sanctions, logs, config, and events.
                </p>
              </div>
              <DeleteGameButton gameId={game.id} gameName={game.name} />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
