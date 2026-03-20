import Link from "next/link"
import {
  HealthBadge,
  MetricCard,
} from "./_components/game-hub-ui"
import { requireCurrentOrg } from "@/lib/auth"
import { getBillingUsageSummary } from "@/lib/billing"
import {
  formatCount,
  formatRelativeTime,
  getGameHealth,
} from "@/lib/game-hub"
import { getGameLogEventDisplay } from "@/lib/game-log-events"
import { cleanupStaleLivePresence, getLiveServerCutoff } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import OnboardingChecklist from "@/components/onboarding-checklist"
import UpsellBanner from "@/components/upsell-banner"
import CelebrationToast from "@/components/celebrations"
import { getMilestones } from "@/lib/milestones"

export default async function DashboardHomePage() {
  const { org, billingOwner, billingSubscription, currentGame } =
    await requireCurrentOrg()
  const usage = await getBillingUsageSummary({
    billingOwnerId: billingOwner.id,
    subscription: billingSubscription,
    currentOrgId: org.id,
  })

  // Données pour onboarding checklist
  const [totalGamesForOrg, totalEventsForOrg, totalMembersForOrg] = await Promise.all([
    prisma.game.count({ where: { orgId: org.id } }),
    prisma.gameLog.count({ where: { game: { orgId: org.id } }, take: 1 }),
    prisma.orgMember.count({ where: { orgId: org.id } }),
  ])

  const hasGame = totalGamesForOrg > 0
  const hasWebhookEvent = totalEventsForOrg > 0
  const hasTeamMember = totalMembersForOrg > 1
  const hasBilling = usage.hasActivePlan && !usage.isTrialActive

  if (!currentGame) {
    return (
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            Pick a game to turn this page into a live game overview.
          </p>
        </div>

        <OnboardingChecklist
          hasGame={hasGame}
          hasWebhookEvent={hasWebhookEvent}
          hasTeamMember={hasTeamMember}
          hasBilling={hasBilling}
        />

        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(232,130,42,0.08)",
            border: "1px solid rgba(232,130,42,0.2)",
            color: "#e8822a",
          }}
        >
          No active game is selected for <strong>{org.name}</strong>. Use the sidebar or open{" "}
          <Link href="/dashboard/games" className="underline font-medium">
            Games
          </Link>{" "}
          to pick one.
        </div>
      </div>
    )
  }

  const now = new Date()
  const liveCutoff = getLiveServerCutoff(now)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  await cleanupStaleLivePresence(prisma, { gameId: currentGame.id })

  const [
    currentGameRecord,
    events24h,
    recentPlayers24h,
    onlinePlayersNow,
    liveServersNow,
    pendingModeration,
    failedModeration24h,
    lastEvent,
    latestLiveServer,
    eventsLast5m,
    recentEvents,
  ] = await Promise.all([
    prisma.game.findUnique({
      where: { id: currentGame.id },
      select: { robloxPlaceId: true, createdAt: true },
    }),
    prisma.gameLog.count({
      where: { gameId: currentGame.id, createdAt: { gte: twentyFourHoursAgo } },
    }),
    prisma.trackedPlayer.count({
      where: { gameId: currentGame.id, lastSeenAt: { gte: twentyFourHoursAgo } },
    }),
    prisma.trackedPlayer.count({
      where: { gameId: currentGame.id, isOnline: true },
    }),
    prisma.liveServer.count({
      where: { gameId: currentGame.id, lastHeartbeatAt: { gte: liveCutoff } },
    }),
    prisma.sanction.count({
      where: { gameId: currentGame.id, deliveryStatus: "PENDING", active: true },
    }),
    prisma.sanction.count({
      where: { gameId: currentGame.id, deliveryStatus: "FAILED", updatedAt: { gte: twentyFourHoursAgo } },
    }),
    prisma.gameLog.findFirst({
      where: { gameId: currentGame.id },
      orderBy: { createdAt: "desc" },
      select: { event: true, payload: true, createdAt: true },
    }),
    prisma.liveServer.findFirst({
      where: { gameId: currentGame.id, lastHeartbeatAt: { gte: liveCutoff } },
      orderBy: { lastHeartbeatAt: "desc" },
      select: { lastHeartbeatAt: true },
    }),
    prisma.gameLog.count({
      where: { gameId: currentGame.id, createdAt: { gte: fiveMinutesAgo } },
    }),
    prisma.gameLog.findMany({
      where: { gameId: currentGame.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { event: true, payload: true, createdAt: true, robloxId: true },
    }),
  ])

  // suppress unused variable warning
  void currentGameRecord

  const health = getGameHealth({
    liveServersNow,
    eventsLast5m,
    failedModeration24h,
    pendingModeration,
    lastEventAt: lastEvent?.createdAt ?? null,
  })

  return (
    <div className="rd-page-enter">
      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid #242424" }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-white">{currentGame.name}</h1>
          <HealthBadge tone={health.tone} label={health.label} />
        </div>
        <p className="text-xs" style={{ color: "#666666" }}>
          {lastEvent?.createdAt
            ? `Last event ${formatRelativeTime(lastEvent.createdAt, now)}`
            : "No events yet"}
        </p>
      </div>

      <div className="space-y-6 p-6">
        {/* ── Onboarding checklist (shows until all steps done) ── */}
        <OnboardingChecklist
          hasGame={hasGame}
          hasWebhookEvent={hasWebhookEvent}
          hasTeamMember={hasTeamMember}
          hasBilling={hasBilling}
        />

        {/* ── Over-limit warning ───────────────────────────────── */}
        {usage.isOverLimit ? (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", color: "#fbbf24" }}>
            This account is over its plan limit. Existing data stays available, but creating new games or workspaces is blocked.
          </div>
        ) : null}

        {/* ── Upsell — approaching game limit ──────────────────── */}
        {!usage.isOverLimit && usage.totalGamesCount >= usage.maxGames - 1 && Number.isFinite(usage.maxGames) ? (
          <UpsellBanner
            type={usage.totalGamesCount >= usage.maxGames ? "reached" : "warning"}
            current={usage.totalGamesCount}
            limit={usage.maxGames}
            resource="games"
          />
        ) : null}

        {/* ── 4 metrics ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Link href="/dashboard/servers">
            <MetricCard
              title="Live servers"
              value={formatCount(liveServersNow)}
              detail={latestLiveServer?.lastHeartbeatAt ? `Last heartbeat ${formatRelativeTime(latestLiveServer.lastHeartbeatAt, now)}` : "No heartbeat yet"}
              accent={liveServersNow > 0 ? "green" : "default"}
            />
          </Link>
          <MetricCard
            title="Players online"
            value={formatCount(onlinePlayersNow)}
            detail={`${formatCount(recentPlayers24h)} active in last 24h`}
            accent={onlinePlayersNow > 0 ? "green" : "default"}
          />
          <MetricCard
            title="Events (24h)"
            value={formatCount(events24h)}
            detail={`${formatCount(eventsLast5m)} in the last 5 min`}
            accent={eventsLast5m > 0 ? "green" : "default"}
          />
          <MetricCard
            title="Moderation"
            value={failedModeration24h > 0 ? `${failedModeration24h} failed` : pendingModeration > 0 ? `${pendingModeration} pending` : "All clear"}
            detail={failedModeration24h > 0 ? "Action required" : pendingModeration > 0 ? "Delivering…" : "No issues"}
            accent={failedModeration24h > 0 ? "red" : pendingModeration > 0 ? "yellow" : "green"}
          />
        </div>

        {/* ── Main body: 2 columns ─────────────────────────────── */}
        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">

          {/* Left — Recent events */}
          <div className="rounded-xl" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
            <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid #242424" }}>
              <p className="text-sm font-semibold text-white">Recent events</p>
              <Link href="/dashboard/logs" className="text-xs font-medium transition-colors" style={{ color: "#e8822a" }}>
                View all →
              </Link>
            </div>

            {recentEvents.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: "#555555" }}>No events yet. Start your Roblox game to see live data here.</p>
              </div>
            ) : (
              <ul>
                {recentEvents.map((ev, i) => {
                  const display = getGameLogEventDisplay(ev.event, ev.payload)
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-4 px-5 py-3.5"
                      style={{ borderBottom: i < recentEvents.length - 1 ? "1px solid #242424" : "none" }}
                    >
                      <span
                        className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background:
                            ev.event === "player_join" ? "#4ade80" :
                            ev.event === "player_leave" ? "#9ca3af" :
                            ev.event === "moderation" ? "#f87171" :
                            "#e8822a",
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">{display?.label ?? ev.event}</p>
                        {ev.robloxId ? (
                          <p className="mt-0.5 text-xs" style={{ color: "#666666" }}>{ev.robloxId}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs" style={{ color: "#555555" }}>
                        {formatRelativeTime(ev.createdAt, now)}
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Right — Status */}
          <div>
            <div className="rounded-xl px-5 py-4" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
              <p className="text-xs font-medium" style={{ color: "#888888" }}>Status</p>
              <p className="mt-1.5 text-sm font-medium text-white">{health.detail}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Celebrations */}
      <CelebrationToast
        milestones={getMilestones({
          totalPlayers: recentPlayers24h,
          totalSanctions: pendingModeration + failedModeration24h,
          totalEvents: events24h,
          gamesCount: usage.totalGamesCount,
        })}
      />
    </div>
  )
}
