import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { OrgRole } from "@prisma/client"
import {
  HealthBadge,
  MetricCard,
  QuickLinkCard,
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
import { maskOpenCloudApiKey } from "@/lib/open-cloud"
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
  const maskedApiKey = game.openCloudApiKey
    ? maskOpenCloudApiKey(game.openCloudApiKey)
    : null
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
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
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
              Workspace: {game.org.name}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm" style={{ color: "#9ca3af" }}>
            This page is the control center for <strong>{game.name}</strong>:
            connect the game, watch its current state, and jump into logs,
            players, analytics, or docs.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/health"
            className="rd-button-secondary"
          >
            Open health
          </Link>
          <Link
            href="/dashboard/logs"
            className="rd-button-secondary"
          >
            Open logs
          </Link>
          <Link
            href="/dashboard/guide"
            className="rd-button-secondary"
          >
            Open installation
          </Link>
          <Link
            href="/dashboard/docs"
            className="rd-button-secondary"
          >
            Open docs
          </Link>
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
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/guide" className="rd-button-primary">
                Open setup
              </Link>
              <Link href="/dashboard/docs" className="rd-button-secondary">
                Open docs
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-6">
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

        <SetupValidatorCard
          items={validator.items}
          requiredComplete={validator.requiredComplete}
          completeRequiredCount={validator.completeRequiredItems.length}
          requiredCount={validator.requiredItems.length}
          totalComplete={validator.totalComplete}
          totalCount={validator.totalCount}
          compact
        />

        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Jump to</h2>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Use these shortcuts when you want to inspect live data or open the dedicated setup and docs pages.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <QuickLinkCard
              title="Health"
              description="See live server state, incidents, and overall monitoring status."
              href="/dashboard/health"
            />
            <QuickLinkCard
              title="Logs"
              description="Watch incoming Roblox events for this game in the live feed."
              href="/dashboard/logs"
            />
            <QuickLinkCard
              title="Players"
              description="Open tracked players, live sessions, and player history."
              href="/dashboard/players"
            />
            <QuickLinkCard
              title="Analytics"
              description="View events, economy, progression, and game-level trends."
              href="/dashboard/analytics"
            />
            <QuickLinkCard
              title="Setup"
              description="Open the installation guide for the 3 required Roblox files."
              href="/dashboard/guide"
            />
            <QuickLinkCard
              title="Docs"
              description="Open developer snippets for custom events, purchases, and modules."
              href="/dashboard/docs"
            />
          </div>
        </section>

        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Features</h2>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Optional add-ons you can enable for this game. Each requires a separate Luau module in your game.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Link
              href={`/dashboard/games/${game.id}/config`}
              className="group rounded-xl p-5 transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(232,130,42,0.1)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
                    <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-[#e8822a] transition-colors">Live Config</p>
                  <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
                    Change game parameters in real-time without republishing.
                  </p>
                </div>
              </div>
            </Link>

            <Link
              href={`/dashboard/games/${game.id}/events`}
              className="group rounded-xl p-5 transition-colors"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: "rgba(232,130,42,0.1)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
                    <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-[#e8822a] transition-colors">Live Events</p>
                  <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
                    Schedule and control in-game events with custom data.
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        <section className="rd-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Connection and configuration
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                Setup and code examples live on their own pages. This section only keeps the connection details and game metadata.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/guide"
                className="rd-button-secondary"
              >
                Go to setup
              </Link>
              <Link
                href="/dashboard/docs"
                className="rd-button-secondary"
              >
                Go to docs
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="space-y-4">
              <div>
                <p className="rd-label mb-1">
                  Webhook URL
                </p>
                <div className="flex gap-2">
                  <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border px-3 py-2 text-gray-100" style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}>
                    {webhookUrl}
                  </code>
                  <CopyButton value={webhookUrl} />
                </div>
              </div>

              <div>
                <p className="rd-label mb-1">
                  Secret header
                </p>
                <div className="flex gap-2">
                  <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border px-3 py-2 text-gray-100" style={{ borderColor: "#2a2a2a", background: "#1a1a1a" }}>
                    {webhookHeader}
                  </code>
                  <CopyButton value={webhookHeader} />
                </div>
              </div>

              <div className="rounded-xl px-4 py-3 text-sm" style={{ border: "1px solid rgba(232,130,42,0.22)", background: "rgba(232,130,42,0.08)", color: "#e8822a" }}>
                To install or update Roblox files for this game, use the dedicated{" "}
                <Link href="/dashboard/guide" className="font-medium underline">
                  Setup
                </Link>{" "}
                page. To track custom systems, use{" "}
                <Link href="/dashboard/docs" className="font-medium underline">
                  Docs
                </Link>
                .
              </div>

              {canManageGame ? (
                <form action={`/api/games/${game.id}/rotate-secret`} method="POST">
                  <button
                    type="submit"
                    className="rounded-lg border border-yellow-800 bg-yellow-950 px-3 py-2 text-xs font-medium text-yellow-200 transition hover:bg-yellow-900"
                  >
                    Rotate secret
                  </button>
                </form>
              ) : null}
            </section>

            <section className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                variant="muted"
                title="Place ID"
                value={game.robloxPlaceId}
                detail="Roblox place linked to this Dashblox game."
              />
              <MetricCard
                variant="muted"
                title="Universe ID"
                value={game.robloxUniverseId ?? "Not set"}
                detail="Optional Roblox universe ID stored for this game."
              />
              <MetricCard
                variant="muted"
                title="Added on"
                value={formatDate(game.createdAt)}
                detail="Date this game was connected to Dashblox."
              />
              <MetricCard
                variant="muted"
                title="Game ID"
                value={game.id.slice(0, 8)}
                detail="Internal Dashblox identifier for this game."
              />
              <MetricCard
                variant="muted"
                title="Roblox auth"
                value={
                  game.robloxConnection
                    ? game.robloxConnection.robloxDisplayName ||
                      game.robloxConnection.robloxUsername ||
                      game.robloxConnection.robloxUserId
                    : "Manual only"
                }
                detail={
                  game.robloxConnection
                    ? "Linked Roblox account available for future authenticated workflows."
                    : "No linked Roblox account stored on this game."
                }
              />
              <MetricCard
                variant="muted"
                title="Open Cloud Key"
                value={maskedApiKey ?? "Not stored"}
                detail={
                  maskedApiKey
                    ? "Stored securely and partially masked here."
                    : "This game currently relies on the linked Roblox account or webhook-only setup."
                }
              />
            </section>
          </div>

          <div className="rd-card-quiet mt-5 p-4">
            <p className="rd-label">
              Enabled modules
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {game.modules.length > 0 ? (
                game.modules.map((moduleId) => (
                  <span
                    key={moduleId}
                    className="rounded-full px-2.5 py-1 text-xs"
                    style={{ border: "1px solid #3a3a3a", color: "#9ca3af" }}
                  >
                    {moduleId}
                  </span>
                ))
              ) : (
                <span className="rounded-full px-2.5 py-1 text-xs" style={{ border: "1px solid #2a2a2a", color: "#666666" }}>
                  No extra modules enabled
                </span>
              )}
            </div>
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
