import Link from "next/link"
import { OrgRole, Prisma } from "@prisma/client"
import {
  HealthBadge,
  MetricCard,
} from "../_components/game-hub-ui"
import { prisma } from "@/lib/prisma"
import { hasRequiredRole, requireCurrentOrg } from "@/lib/auth"
import { getBillingUsageSummary } from "@/lib/billing"
import {
  formatCount,
  formatDate,
  formatRelativeTime,
  getGameHealth,
} from "@/lib/game-hub"
import { getGameLogEventDisplay } from "@/lib/game-log-events"
import { getLiveServerCutoff } from "@/lib/live-presence"
import CopyButton from "./copy-button"

type LatestLogRow = {
  id: string
  gameId: string
  event: string
  payload: Prisma.JsonValue
  createdAt: Date
}

export default async function GamesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { member, org, billingOwner, billingSubscription, currentGame } =
    await requireCurrentOrg()
  const resolvedSearchParams = (await searchParams) ?? {}
  const createdGameId = Array.isArray(resolvedSearchParams.created)
    ? resolvedSearchParams.created[0]
    : resolvedSearchParams.created
  const games = await prisma.game.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      robloxPlaceId: true,
      modules: true,
      createdAt: true,
    },
  })
  const usage = await getBillingUsageSummary({
    billingOwnerId: billingOwner.id,
    subscription: billingSubscription,
    currentOrgId: org.id,
  })
  const canManageGames = hasRequiredRole(member.role, OrgRole.ADMIN)
  const createdGame =
    createdGameId && canManageGames
      ? await prisma.game.findFirst({
          where: {
            id: createdGameId,
            orgId: org.id,
          },
          select: {
            id: true,
            name: true,
            webhookSecret: true,
          },
        })
      : null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const webhookUrl = createdGame
    ? `${appUrl}/api/webhook/${createdGame.id}`
    : null
  const usageLabel = Number.isFinite(usage.maxGames)
    ? `${usage.totalGamesCount} of ${usage.maxGames}`
    : `${usage.totalGamesCount}`
  const usageCardLabel = Number.isFinite(usage.maxGames)
    ? `${usage.totalGamesCount} / ${usage.maxGames}`
    : `${usage.totalGamesCount} / Unlimited`
  const otherWorkspaceGamesCount =
    usage.totalGamesCount - usage.currentOrgGamesCount
  const gameIds = games.map((game) => game.id)
  const now = new Date()
  const liveCutoff = getLiveServerCutoff(now)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  function getActivateGameHref(gameId: string, redirectTo: string) {
    const search = new URLSearchParams({
      gameId,
      redirectTo,
    })

    return `/api/games/current?${search.toString()}`
  }

  const [
    liveStatsRows,
    events24hRows,
    events5mRows,
    failedModerationRows,
    pendingModerationRows,
    latestLogs,
  ] =
    gameIds.length === 0
      ? [[], [], [], [], [], []]
      : await Promise.all([
          prisma.liveServer.groupBy({
            by: ["gameId"],
            where: {
              gameId: {
                in: gameIds,
              },
              lastHeartbeatAt: {
                gte: liveCutoff,
              },
            },
            _count: {
              _all: true,
            },
            _sum: {
              lastPlayerCount: true,
            },
            _max: {
              lastHeartbeatAt: true,
            },
          }),
          prisma.gameLog.groupBy({
            by: ["gameId"],
            where: {
              gameId: {
                in: gameIds,
              },
              createdAt: {
                gte: twentyFourHoursAgo,
              },
            },
            _count: {
              _all: true,
            },
          }),
          prisma.gameLog.groupBy({
            by: ["gameId"],
            where: {
              gameId: {
                in: gameIds,
              },
              createdAt: {
                gte: fiveMinutesAgo,
              },
            },
            _count: {
              _all: true,
            },
          }),
          prisma.sanction.groupBy({
            by: ["gameId"],
            where: {
              gameId: {
                in: gameIds,
              },
              deliveryStatus: "FAILED",
              updatedAt: {
                gte: twentyFourHoursAgo,
              },
            },
            _count: {
              _all: true,
            },
          }),
          prisma.sanction.groupBy({
            by: ["gameId"],
            where: {
              gameId: {
                in: gameIds,
              },
              active: true,
              deliveryStatus: "PENDING",
            },
            _count: {
              _all: true,
            },
          }),
          prisma.$queryRaw<LatestLogRow[]>`
            SELECT DISTINCT ON ("gameId")
              id,
              "gameId",
              event,
              payload,
              "createdAt"
            FROM "GameLog"
            WHERE "gameId" IN (${Prisma.join(gameIds)})
            ORDER BY "gameId", "createdAt" DESC
          `,
        ])

  const liveStatsByGameId = new Map(
    liveStatsRows.map((row) => [
      row.gameId,
      {
        liveServersNow: row._count._all,
        playersOnlineNow: row._sum.lastPlayerCount ?? 0,
        lastHeartbeatAt: row._max.lastHeartbeatAt ?? null,
      },
    ])
  )
  const events24hByGameId = new Map(
    events24hRows.map((row) => [row.gameId, row._count._all])
  )
  const events5mByGameId = new Map(
    events5mRows.map((row) => [row.gameId, row._count._all])
  )
  const failedModerationByGameId = new Map(
    failedModerationRows.map((row) => [row.gameId, row._count._all])
  )
  const pendingModerationByGameId = new Map(
    pendingModerationRows.map((row) => [row.gameId, row._count._all])
  )
  const latestLogByGameId = new Map(latestLogs.map((row) => [row.gameId, row]))

  const gameCards = games
    .map((game) => {
      const liveStats = liveStatsByGameId.get(game.id)
      const latestLog = latestLogByGameId.get(game.id) ?? null
      const health = getGameHealth({
        liveServersNow: liveStats?.liveServersNow ?? 0,
        eventsLast5m: events5mByGameId.get(game.id) ?? 0,
        failedModeration24h: failedModerationByGameId.get(game.id) ?? 0,
        pendingModeration: pendingModerationByGameId.get(game.id) ?? 0,
        lastEventAt: latestLog?.createdAt ?? null,
      })

      return {
        ...game,
        isCurrent: currentGame?.id === game.id,
        health,
        liveServersNow: liveStats?.liveServersNow ?? 0,
        playersOnlineNow: liveStats?.playersOnlineNow ?? 0,
        lastHeartbeatAt: liveStats?.lastHeartbeatAt ?? null,
        events24h: events24hByGameId.get(game.id) ?? 0,
        lastEventAt: latestLog?.createdAt ?? null,
        latestEventDisplay: latestLog
          ? getGameLogEventDisplay(latestLog.event, latestLog.payload)
          : null,
      }
    })
    .sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) {
        return left.isCurrent ? -1 : 1
      }

      if (left.liveServersNow !== right.liveServersNow) {
        return right.liveServersNow - left.liveServersNow
      }

      const rightLastEventAt = right.lastEventAt?.getTime() ?? 0
      const leftLastEventAt = left.lastEventAt?.getTime() ?? 0

      if (rightLastEventAt !== leftLastEventAt) {
        return rightLastEventAt - leftLastEventAt
      }

      return right.createdAt.getTime() - left.createdAt.getTime()
    })

  const workspaceLiveServers = gameCards.reduce(
    (sum, game) => sum + game.liveServersNow,
    0
  )
  const workspaceOnlinePlayers = gameCards.reduce(
    (sum, game) => sum + game.playersOnlineNow,
    0
  )

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Games</h1>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Connected Roblox games for {org.name}. Use this page as your game
            directory and quick status overview.
          </p>
        </div>
        {canManageGames && usage.canCreateGame ? (
          <Link href="/dashboard/games/new" className="rd-button-primary">
            + Add Game
          </Link>
        ) : (
          <div className="rd-card-muted px-4 py-2 text-sm font-medium" style={{ color: "#666666" }}>
            {canManageGames ? "Game limit reached" : "Admin access required"}
          </div>
        )}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-4">
        <MetricCard
          title="Workspace Games"
          value={formatCount(games.length)}
          detail={`${formatCount(
            usage.currentOrgGamesCount
          )} connected in this workspace.`}
        />
        <MetricCard
          title="Account Usage"
          value={usageCardLabel}
          detail="Game slots used across the full billing account."
        />
        <MetricCard
          title="Live Right Now"
          value={`${formatCount(workspaceLiveServers)} servers`}
          detail={`${formatCount(
            workspaceOnlinePlayers
          )} players online across this workspace.`}
        />
        <MetricCard
          title="Current Selection"
          value={currentGame?.name ?? "No active game"}
          detail={
            currentGame
              ? "Sidebar actions will follow this game."
              : "Pick a game from the list or sidebar."
          }
        />
      </div>

      <div className="rd-card mb-6 p-4 text-sm" style={{ color: "#9ca3af" }}>
        {Number.isFinite(usage.maxGames)
          ? `${usageLabel} game slots used across this billing account. This workspace currently has ${usage.currentOrgGamesCount} game(s).`
          : `${usageLabel} games connected across this billing account. This workspace currently has ${usage.currentOrgGamesCount} game(s).`}
      </div>

      {usage.isOverGameLimit ? (
        <div className="mb-6 rounded-xl border border-yellow-900 bg-yellow-950/60 px-4 py-3 text-sm text-yellow-200">
          This account is currently over its plan limit after a downgrade.
          Existing games remain available, but adding new games is blocked
          until usage drops below the plan limit or the account is upgraded
          again.
        </div>
      ) : null}

      {games.length === 0 && otherWorkspaceGamesCount > 0 ? (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{
            border: "1px solid rgba(232,130,42,0.22)",
            background: "rgba(232,130,42,0.08)",
            color: "#e8822a",
          }}
        >
          This workspace does not have any connected games yet. This billing
          account still has {otherWorkspaceGamesCount} game(s) in other
          workspace(s), but games are only visible inside the workspace they
          belong to.
        </div>
      ) : null}

      {createdGame && webhookUrl ? (
        <div className="mb-6 rounded-xl border border-green-900 bg-green-950/60 p-5">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-green-200">
              {createdGame.name} connected successfully
            </h2>
            <p className="mt-1 text-sm text-green-300/80">
              Save this webhook configuration in your Roblox integration now.
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-green-300/70">
                Webhook URL
              </p>
              <div className="flex gap-2">
                <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border border-green-900 bg-[#1a1a1a] px-3 py-2 text-green-100">
                  {webhookUrl}
                </code>
                <CopyButton value={webhookUrl} />
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-green-300/70">
                Header
              </p>
              <div className="flex gap-2">
                <code className="block min-w-0 flex-1 overflow-x-auto rounded-lg border border-green-900 bg-[#1a1a1a] px-3 py-2 text-green-100">
                  x-webhook-secret: {createdGame.webhookSecret}
                </code>
                <CopyButton
                  value={`x-webhook-secret: ${createdGame.webhookSecret}`}
                />
              </div>
            </div>

            <p className="text-xs text-green-300/70">
              This secret is only shown automatically right after creation.
            </p>
          </div>
        </div>
      ) : null}

      {games.length === 0 ? (
        <div className="rd-card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 text-4xl">🎮</div>
          <h2 className="mb-1 text-base font-semibold text-white">
            No games yet
          </h2>
          <p className="mb-6 max-w-xs text-sm" style={{ color: "#9ca3af" }}>
            Connect your first Roblox game to start receiving events and
            moderation data.
          </p>
          {canManageGames && usage.canCreateGame ? (
            <Link href="/dashboard/games/new" className="rd-button-primary">
              Add your first game
            </Link>
          ) : (
            <p className="text-sm" style={{ color: "#666666" }}>
              {canManageGames
                ? "This billing account cannot add more games right now."
                : "Ask an admin or owner to add games."}
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {gameCards.map((game) => (
            <section
              key={game.id}
              className="rd-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={getActivateGameHref(
                        game.id,
                        `/dashboard/games/${game.id}`
                      )}
                      className="text-lg font-semibold text-white transition hover:text-[#e8822a]"
                    >
                      {game.name}
                    </Link>
                    {game.isCurrent ? (
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          border: "1px solid rgba(232,130,42,0.22)",
                          background: "rgba(232,130,42,0.12)",
                          color: "#e8822a",
                        }}
                      >
                        Current
                      </span>
                    ) : null}
                    <HealthBadge tone={game.health.tone} label={game.health.label} />
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                    Place ID: {game.robloxPlaceId}
                  </p>
                  <p className="mt-1 text-sm" style={{ color: "#666666" }}>
                    Added {formatDate(game.createdAt)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="rd-label">
                    Latest signal
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {game.lastEventAt
                      ? formatRelativeTime(game.lastEventAt, now)
                      : "No events yet"}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "#666666" }}>
                    {game.lastEventAt
                      ? formatDate(game.lastEventAt)
                      : "Waiting for setup"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  variant="muted"
                  title="Live Servers"
                  value={formatCount(game.liveServersNow)}
                  detail={
                    game.lastHeartbeatAt
                      ? `Last heartbeat ${formatRelativeTime(
                          game.lastHeartbeatAt,
                          now
                        )}`
                      : "No active heartbeat"
                  }
                />
                <MetricCard
                  variant="muted"
                  title="Players Online"
                  value={formatCount(game.playersOnlineNow)}
                  detail="Approximate live player count across active servers."
                />
                <MetricCard
                  variant="muted"
                  title="Events 24h"
                  value={formatCount(game.events24h)}
                  detail="Webhook events received in the last 24 hours."
                />
                <MetricCard
                  variant="muted"
                  title="Health"
                  value={game.health.label}
                  detail={game.health.detail}
                />
              </div>

              <div className="rd-card-quiet mt-5 p-4">
                <p className="rd-label">
                  Latest event
                </p>
                <p className="mt-2 text-sm font-medium text-white">
                  {game.latestEventDisplay?.label ?? "No webhook event yet"}
                </p>
                <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                  {game.latestEventDisplay?.summary ??
                    "Connect the runtime and start the game to populate this feed."}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
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

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href={getActivateGameHref(
                    game.id,
                    `/dashboard/games/${game.id}`
                  )}
                  className="rd-button-primary"
                >
                  Open
                </Link>
                <Link
                  href={getActivateGameHref(game.id, "/dashboard/health")}
                  className="rd-link-accent text-sm font-medium"
                >
                  Health
                </Link>
                <Link
                  href={getActivateGameHref(game.id, "/dashboard/logs")}
                  className="rd-link-accent text-sm font-medium"
                >
                  Logs
                </Link>
                <Link
                  href={getActivateGameHref(game.id, "/dashboard/analytics")}
                  className="rd-link-accent text-sm font-medium"
                >
                  Analytics
                </Link>
                <Link
                  href={getActivateGameHref(game.id, "/dashboard/players")}
                  className="rd-link-accent text-sm font-medium"
                >
                  Players
                </Link>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
