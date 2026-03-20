import Link from "next/link"
import {
  HealthBadge,
} from "../_components/game-hub-ui"
import { requireCurrentOrg } from "@/lib/auth"
import {
  formatCount,
  formatDateTime,
  formatRelativeTime,
  getHealthBadgeClasses,
  getHealthPanelClasses,
  getToneRank,
  HealthTone,
} from "@/lib/game-hub"
import { getGameLogEventDisplay } from "@/lib/game-log-events"
import { cleanupStaleLivePresence, getLiveServerCutoff } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import { HealthLiveRefresh } from "./health-live-refresh"

type HealthAlert = {
  id: string
  tone: HealthTone
  title: string
  detail: string
  href?: string
  hrefLabel?: string
}
type HealthIncident = {
  id: string
  tone: HealthTone
  title: string
  detail: string
  happenedAt: Date
  href?: string
  hrefLabel?: string
}

export const dynamic = "force-dynamic"

function getWebhookHealth(params: {
  lastEventAt: Date | null
  liveServersNow: number
  referenceDate: Date
}) {
  const { lastEventAt, liveServersNow, referenceDate } = params

  if (!lastEventAt) {
    if (liveServersNow === 0) {
      return {
        tone: "idle" as HealthTone,
        label: "Not started",
        detail:
          "No live servers and no telemetry yet. Start the game once to initialize monitoring.",
      }
    }

    return {
      tone: "critical" as HealthTone,
      label: "Not receiving events",
      detail: "This game has not sent any webhook events yet.",
    }
  }

  const ageSeconds = Math.round(
    (referenceDate.getTime() - lastEventAt.getTime()) / 1000
  )

  if (liveServersNow > 0 && ageSeconds <= 120) {
    return {
      tone: "healthy" as HealthTone,
      label: "Healthy",
      detail: `Last event ${formatRelativeTime(lastEventAt, referenceDate)} while servers are live.`,
    }
  }

  if (liveServersNow > 0) {
    return {
      tone: "warning" as HealthTone,
      label: "Delayed",
      detail: `Live servers exist, but the last event was ${formatRelativeTime(lastEventAt, referenceDate)}.`,
    }
  }

  return {
    tone: "idle" as HealthTone,
    label: "Idle",
    detail: `No recent activity. Last event was ${formatRelativeTime(lastEventAt, referenceDate)}.`,
  }
}

function getModerationHealth(params: {
  pendingModeration: number
  failedModeration24h: number
  liveServersNow: number
}) {
  const { pendingModeration, failedModeration24h, liveServersNow } = params

  if (failedModeration24h > 0) {
    return {
      tone: "critical" as HealthTone,
      label: "Failures detected",
      detail: `${formatCount(failedModeration24h)} moderation deliveries failed in the last 24 hours.`,
    }
  }

  if (pendingModeration > 0) {
    if (liveServersNow === 0) {
      return {
        tone: "idle" as HealthTone,
        label: "Queued",
        detail: `${formatCount(
          pendingModeration
        )} moderation actions are queued, but no live server is connected right now to acknowledge them.`,
      }
    }

    return {
      tone: "warning" as HealthTone,
      label: "Waiting for ack",
      detail: `${formatCount(pendingModeration)} moderation actions are still pending game acknowledgement.`,
    }
  }

  return {
    tone: "healthy" as HealthTone,
    label: "Healthy",
    detail: "No pending or failed moderation deliveries right now.",
  }
}

function getOverallHealth(params: {
  alerts: HealthAlert[]
  liveServersNow: number
  lastEventAt: Date | null
  referenceDate: Date
}) {
  const { alerts, liveServersNow, lastEventAt, referenceDate } = params
  const highestAlert =
    alerts.length > 0
      ? alerts.reduce((current, alert) =>
          getToneRank(alert.tone) > getToneRank(current.tone) ? alert : current
        )
      : null

  if (highestAlert && getToneRank(highestAlert.tone) >= getToneRank("warning")) {
    return {
      tone: highestAlert.tone,
      label: highestAlert.tone === "critical" ? "Critical" : "Warning",
      detail: highestAlert.detail,
    }
  }

  if (!lastEventAt && liveServersNow === 0) {
    return {
      tone: "idle" as HealthTone,
      label: "Idle",
      detail:
        "No live servers and no telemetry yet. Start the game once to initialize monitoring.",
    }
  }

  if (!lastEventAt) {
    return {
      tone: "critical" as HealthTone,
      label: "Critical",
      detail: "This game has not sent any telemetry yet.",
    }
  }

  if (liveServersNow === 0) {
    return {
      tone: "idle" as HealthTone,
      label: "Idle",
      detail: `No live servers right now. Last signal ${formatRelativeTime(lastEventAt, referenceDate)}.`,
    }
  }

  return {
    tone: "healthy" as HealthTone,
    label: "Healthy",
    detail: `Live servers are connected and Dashblox received recent telemetry ${formatRelativeTime(lastEventAt, referenceDate)}.`,
  }
}

function StatusCard(props: {
  title: string
  value: string
  tone: HealthTone
  detail: string
}) {
  return (
    <div className={`rounded-xl border p-5 ${getHealthPanelClasses(props.tone)}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-white/60">
        {props.title}
      </p>
      <p className="mt-2 text-2xl font-bold text-white">{props.value}</p>
      <p className="mt-2 text-sm text-white/80">{props.detail}</p>
    </div>
  )
}

function AlertCard(props: HealthAlert) {
  return (
    <div className={`rounded-lg border p-4 ${getHealthPanelClasses(props.tone)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-white">{props.title}</p>
          <p className="mt-1 text-sm text-white/80">{props.detail}</p>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${getHealthBadgeClasses(
            props.tone
          )}`}
        >
          {props.tone}
        </span>
      </div>
      {props.href && props.hrefLabel ? (
        <Link
          href={props.href}
          className="mt-3 inline-flex text-sm font-medium text-white/90 transition hover:text-white"
        >
          {props.hrefLabel}
        </Link>
      ) : null}
    </div>
  )
}

export default async function GameHealthPage() {
  const { org, currentGame } = await requireCurrentOrg()

  if (!currentGame) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Game Health</h1>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Select a game to inspect webhook health, live servers, and issues.
          </p>
        </div>

        <div className="rd-card px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-white">
            No active game selected
          </h2>
          <p className="mt-2 text-sm" style={{ color: "#666666" }}>
            Pick a game from the sidebar or connect one from the Games page to
            open its health view.
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

  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const liveCutoff = getLiveServerCutoff(now)

  const cleanupResult = await cleanupStaleLivePresence(prisma, {
    gameId: currentGame.id,
    referenceDate: now,
  })

  const [
    lastEvent,
    eventsLast5m,
    eventsLast24h,
    joinsLast24h,
    onlinePlayersNow,
    trackedPlayers24h,
    liveServersNow,
    liveServers,
    latestServerHeartbeat,
    pendingModeration,
    failedModeration24h,
    recentFailedSanctions,
    recentLogs,
  ] = await Promise.all([
    prisma.gameLog.findFirst({
      where: {
        gameId: currentGame.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        event: true,
        payload: true,
        createdAt: true,
      },
    }),
    prisma.gameLog.count({
      where: {
        gameId: currentGame.id,
        createdAt: {
          gte: fiveMinutesAgo,
        },
      },
    }),
    prisma.gameLog.count({
      where: {
        gameId: currentGame.id,
        createdAt: {
          gte: twentyFourHoursAgo,
        },
      },
    }),
    prisma.gameLog.count({
      where: {
        gameId: currentGame.id,
        event: "player_join",
        createdAt: {
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
    prisma.trackedPlayer.count({
      where: {
        gameId: currentGame.id,
        lastSeenAt: {
          gte: twentyFourHoursAgo,
        },
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
    prisma.liveServer.findMany({
      where: {
        gameId: currentGame.id,
        lastHeartbeatAt: {
          gte: liveCutoff,
        },
      },
      orderBy: {
        lastHeartbeatAt: "desc",
      },
      take: 5,
      select: {
        jobId: true,
        placeId: true,
        lastHeartbeatAt: true,
        lastPlayerCount: true,
        startedAt: true,
      },
    }),
    prisma.liveServer.findFirst({
      where: {
        gameId: currentGame.id,
      },
      orderBy: {
        lastHeartbeatAt: "desc",
      },
      select: {
        lastHeartbeatAt: true,
      },
    }),
    prisma.sanction.count({
      where: {
        gameId: currentGame.id,
        active: true,
        deliveryStatus: "PENDING",
      },
    }),
    prisma.sanction.count({
      where: {
        gameId: currentGame.id,
        deliveryStatus: "FAILED",
        updatedAt: {
          gte: twentyFourHoursAgo,
        },
      },
    }),
    prisma.sanction.findMany({
      where: {
        gameId: currentGame.id,
        deliveryStatus: "FAILED",
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        type: true,
        reason: true,
        robloxId: true,
        updatedAt: true,
        deliveryDetails: true,
        player: {
          select: {
            username: true,
            displayName: true,
          },
        },
      },
    }),
    prisma.gameLog.findMany({
      where: {
        gameId: currentGame.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        event: true,
        payload: true,
        robloxId: true,
        createdAt: true,
      },
    }),
  ])

  const recentLogPlayerIds = Array.from(
    new Set(
      recentLogs
        .map((log) => log.robloxId)
        .filter((robloxId): robloxId is string => Boolean(robloxId))
    )
  )

  const recentLogPlayers =
    recentLogPlayerIds.length === 0
      ? []
      : await prisma.trackedPlayer.findMany({
          where: {
            gameId: currentGame.id,
            robloxId: {
              in: recentLogPlayerIds,
            },
          },
          select: {
            robloxId: true,
            username: true,
            displayName: true,
          },
        })

  const playerByRobloxId = new Map(
    recentLogPlayers.map((player) => [player.robloxId, player])
  )

  const lastEventDisplay = lastEvent
    ? getGameLogEventDisplay(lastEvent.event, lastEvent.payload)
    : null
  const webhookHealth = getWebhookHealth({
    lastEventAt: lastEvent?.createdAt ?? null,
    liveServersNow,
    referenceDate: now,
  })
  const moderationHealth = getModerationHealth({
    pendingModeration,
    failedModeration24h,
    liveServersNow,
  })
  const liveOpsTone: HealthTone = liveServersNow > 0 ? "healthy" : "idle"
  const playerTone: HealthTone = onlinePlayersNow > 0 ? "healthy" : "idle"
  const hasPresenceCleanupIssue =
    cleanupResult.staleServerCount > 0 || cleanupResult.clearedPlayerCount > 0

  const alerts: HealthAlert[] = []

  if (webhookHealth.tone === "critical") {
    alerts.push({
      id: "webhook-critical",
      tone: webhookHealth.tone,
      title: "Telemetry is not reaching Dashblox",
      detail: webhookHealth.detail,
      href: "/dashboard/games",
      hrefLabel: "Check setup",
    })
  } else if (liveServersNow > 0 && eventsLast5m === 0) {
    alerts.push({
      id: "live-servers-no-events",
      tone: "critical",
      title: "Live servers without fresh telemetry",
      detail:
        "At least one server is live, but no event has reached Dashblox in the last 5 minutes.",
      href: "/dashboard/logs",
      hrefLabel: "Open logs",
    })
  } else if (webhookHealth.tone === "warning") {
    alerts.push({
      id: "webhook-delayed",
      tone: "warning",
      title: "Webhook activity is delayed",
      detail: webhookHealth.detail,
      href: "/dashboard/logs",
      hrefLabel: "Inspect logs",
    })
  }

  if (moderationHealth.tone === "critical") {
    alerts.push({
      id: "moderation-failures",
      tone: moderationHealth.tone,
      title: "Moderation delivery failures detected",
      detail: moderationHealth.detail,
      href: "/dashboard/moderation",
      hrefLabel: "Open moderation",
    })
  } else if (moderationHealth.tone === "warning") {
    alerts.push({
      id: "moderation-pending",
      tone: moderationHealth.tone,
      title: "Moderation acknowledgements pending",
      detail: moderationHealth.detail,
      href: "/dashboard/moderation",
      hrefLabel: "Review pending actions",
    })
  }

  if (alerts.length === 0) {
    alerts.push({
      id: "healthy",
      tone: liveServersNow > 0 ? "healthy" : "idle",
      title:
        liveServersNow > 0
          ? "No active health issues"
          : "No active issues while the game is idle",
      detail:
        liveServersNow > 0
          ? "Telemetry is flowing, moderation delivery is healthy, and live presence looks consistent."
          : "There are no live servers right now, but the latest telemetry and moderation state look healthy.",
    })
  }

  const overallHealth = getOverallHealth({
    alerts,
    liveServersNow,
    lastEventAt: lastEvent?.createdAt ?? null,
    referenceDate: now,
  })

  const incidents: HealthIncident[] = [
    ...recentLogs
      .filter((log) => log.event === "server_started" || log.event === "server_stopped")
      .map((log) => ({
        id: `log-${log.id}`,
        tone: log.event === "server_stopped" ? ("warning" as HealthTone) : ("healthy" as HealthTone),
        title:
          log.event === "server_stopped"
            ? "Server stopped"
            : "Server started",
        detail:
          getGameLogEventDisplay(log.event, log.payload).summary ||
          getGameLogEventDisplay(log.event, log.payload).label,
        happenedAt: log.createdAt,
        href: "/dashboard/logs",
        hrefLabel: "Open logs",
      })),
    ...recentFailedSanctions.map((sanction) => ({
      id: `sanction-${sanction.id}`,
      tone: "critical" as HealthTone,
      title: `Moderation failed for ${
        sanction.player?.displayName || sanction.player?.username || sanction.robloxId
      }`,
      detail: sanction.deliveryDetails || sanction.reason,
      happenedAt: sanction.updatedAt,
      href: "/dashboard/moderation",
      hrefLabel: "Open moderation",
    })),
    ...(hasPresenceCleanupIssue
      ? [
          {
            id: "presence-cleanup",
            tone: "idle" as HealthTone,
            title: "Stale live presence cleaned up",
            detail: `Dashblox cleared ${formatCount(
              cleanupResult.clearedPlayerCount
            )} player sessions from ${formatCount(
              cleanupResult.staleServerCount
            )} stale servers.`,
            happenedAt: now,
            href: "/dashboard/logs",
            hrefLabel: "Review live activity",
          },
        ]
      : []),
  ]
    .sort((left, right) => right.happenedAt.getTime() - left.happenedAt.getTime())
    .slice(0, 6)

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{currentGame.name}</h1>
            <HealthBadge tone={overallHealth.tone} label={overallHealth.label} />
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{ border: "1px solid #2a2a2a", background: "#222222", color: "#9ca3af" }}
            >
              Workspace: {org.name}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Live monitoring view for {currentGame.name}. Use this page to spot
            webhook issues, quiet servers, and moderation delivery problems.
          </p>
        </div>

      </div>

      <HealthLiveRefresh />

      <section
        className={`mb-8 rounded-xl border p-5 ${getHealthPanelClasses(overallHealth.tone)}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-white/60">
              Overall status
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">
              {overallHealth.label}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-white/80">
              {overallHealth.detail}
            </p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${getHealthBadgeClasses(
              overallHealth.tone
            )}`}
          >
            {overallHealth.label}
          </span>
        </div>
      </section>

      <div className="mb-8 grid gap-4 lg:grid-cols-4">
        <StatusCard
          title="Webhook"
          value={webhookHealth.label}
          tone={webhookHealth.tone}
          detail={webhookHealth.detail}
        />
        <StatusCard
          title="Live servers"
          value={formatCount(liveServersNow)}
          tone={liveOpsTone}
          detail={
            liveServersNow > 0
              ? `${formatCount(eventsLast5m)} events received in the last 5 minutes.`
              : `Last heartbeat ${formatRelativeTime(
                  latestServerHeartbeat?.lastHeartbeatAt ?? null,
                  now
                )}.`
          }
        />
        <StatusCard
          title="Players online"
          value={formatCount(onlinePlayersNow)}
          tone={playerTone}
          detail={
            trackedPlayers24h > 0
              ? `${formatCount(trackedPlayers24h)} active players in the last 24 hours.`
              : "No tracked players were active in the last 24 hours."
          }
        />
        <StatusCard
          title="Moderation delivery"
          value={moderationHealth.label}
          tone={moderationHealth.tone}
          detail={moderationHealth.detail}
        />
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Current signal</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rd-card-quiet p-4">
              <p className="rd-label">
                Last event received
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {lastEventDisplay?.label ?? "No events yet"}
              </p>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                {lastEvent
                  ? `${formatRelativeTime(lastEvent.createdAt, now)} • ${formatDateTime(
                      lastEvent.createdAt
                    )}`
                  : "Waiting for the first webhook event from Roblox."}
              </p>
            </div>

            <div className="rd-card-quiet p-4">
              <p className="rd-label">
                Last heartbeat
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {latestServerHeartbeat?.lastHeartbeatAt
                  ? formatRelativeTime(latestServerHeartbeat.lastHeartbeatAt, now)
                  : "No heartbeat yet"}
              </p>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                {latestServerHeartbeat?.lastHeartbeatAt
                  ? formatDateTime(latestServerHeartbeat.lastHeartbeatAt)
                  : "Server heartbeat data will appear after the game starts sending live server pings."}
              </p>
            </div>

            <div className="rd-card-quiet p-4">
              <p className="rd-label">
                Events in last 5 minutes
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCount(eventsLast5m)}
              </p>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                {eventsLast5m > 0
                  ? "Fresh telemetry is arriving right now."
                  : "No very recent events were received."}
              </p>
            </div>

            <div className="rd-card-quiet p-4">
              <p className="rd-label">
                Last 24 hours
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatCount(eventsLast24h)} events • {formatCount(joinsLast24h)} joins
              </p>
              <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                {formatCount(trackedPlayers24h)} tracked players active in the same period.
              </p>
            </div>
          </div>
        </section>

        <section className="rd-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Active alerts</h2>
            <span className="text-xs" style={{ color: "#666666" }}>
              {formatCount(alerts.length)} item{alerts.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-5 space-y-3 text-sm" style={{ color: "#9ca3af" }}>
            {alerts.map((alert) => (
              <AlertCard key={alert.id} {...alert} />
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Live servers</h2>
          <div className="mt-5 space-y-3">
            {liveServers.length > 0 ? (
              liveServers.map((server) => (
                <div
                  key={server.jobId}
                  className="rd-card-quiet p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {server.jobId.startsWith("studio-")
                          ? "Studio server"
                          : `Server ${server.jobId.slice(0, 8)}`}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "#666666" }}>
                        {server.placeId ? `Place ${server.placeId}` : "No place ID"}
                      </p>
                    </div>
                    <span className="rounded-full border border-green-900 bg-green-950/60 px-2.5 py-1 text-xs text-green-200">
                      {formatCount(server.lastPlayerCount)} players
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2" style={{ color: "#9ca3af" }}>
                    <p>Started {formatRelativeTime(server.startedAt, now)}</p>
                    <p>Heartbeat {formatRelativeTime(server.lastHeartbeatAt, now)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm" style={{ borderColor: "#3a3a3a", color: "#666666" }}>
                No live servers right now. Start the game to populate this list.
              </div>
            )}
          </div>
        </section>

        <section className="rd-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-white">Recent incidents</h2>
            <span className="text-xs" style={{ color: "#666666" }}>Ops timeline</span>
          </div>
          <div className="mt-5 space-y-3">
            {incidents.length > 0 ? (
              incidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`rounded-lg border p-4 ${getHealthPanelClasses(incident.tone)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{incident.title}</p>
                      <p className="mt-1 text-sm text-white/80">{incident.detail}</p>
                    </div>
                    <span className="text-xs text-white/70">
                      {formatRelativeTime(incident.happenedAt, now)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-white/70">
                      {formatDateTime(incident.happenedAt)}
                    </p>
                    {incident.href && incident.hrefLabel ? (
                      <Link
                        href={incident.href}
                        className="text-sm font-medium text-white/90 transition hover:text-white"
                      >
                        {incident.hrefLabel}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm" style={{ borderColor: "#3a3a3a", color: "#666666" }}>
                No recent incidents for this game.
              </div>
            )}
          </div>
        </section>

        <section className="rd-card p-5">
          <h2 className="text-base font-semibold text-white">Moderation issues</h2>
          <div className="mt-5 space-y-3">
            {recentFailedSanctions.length > 0 ? (
              recentFailedSanctions.map((sanction) => (
                <div
                  key={sanction.id}
                  className="rounded-lg border border-red-900 bg-red-950/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">
                        {sanction.type} for{" "}
                        {sanction.player?.displayName ||
                          sanction.player?.username ||
                          sanction.robloxId}
                      </p>
                      <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>{sanction.reason}</p>
                    </div>
                    <span className="text-xs text-red-200">
                      {formatRelativeTime(sanction.updatedAt, now)}
                    </span>
                  </div>
                  {sanction.deliveryDetails ? (
                    <p className="mt-3 text-xs text-red-100/80">
                      {sanction.deliveryDetails}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed px-4 py-8 text-sm" style={{ borderColor: "#3a3a3a", color: "#666666" }}>
                No recent moderation delivery failures for this game.
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rd-card mt-6 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Recent activity</h2>
          <Link
            href="/dashboard/logs"
            className="rd-link-accent text-sm font-medium"
          >
            View full logs
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => {
              const eventDisplay = getGameLogEventDisplay(log.event, log.payload)
              const player = log.robloxId
                ? playerByRobloxId.get(log.robloxId) ?? null
                : null

              return (
                <div
                  key={log.id}
                  className="rd-card-quiet p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{eventDisplay.label}</p>
                      <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                        {eventDisplay.summary || "No extra details"}
                      </p>
                    </div>
                    <p className="text-xs" style={{ color: "#666666" }}>
                      {formatRelativeTime(log.createdAt, now)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: "#666666" }}>
                    <span>
                      Player:{" "}
                      {player?.displayName || player?.username || log.robloxId || "None"}
                    </span>
                    <span>{formatDateTime(log.createdAt)}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed px-4 py-8 text-sm" style={{ borderColor: "#3a3a3a", color: "#666666" }}>
              No activity yet. Start the game and send a few events to build the health feed.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
