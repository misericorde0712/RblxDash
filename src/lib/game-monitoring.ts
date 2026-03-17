import type { PrismaClient } from "@prisma/client"
import { getGameHealth } from "@/lib/game-hub"
import { getLiveServerCutoff } from "@/lib/live-presence"

type ActionPresenceRow = {
  hasEconomy: boolean
  hasProgression: boolean
  hasCustomAction: boolean
}

export type SetupValidatorItem = {
  key: string
  label: string
  status: "complete" | "missing"
  required: boolean
  detail: string
}

export async function getGameHealthSnapshot(
  prisma: PrismaClient,
  gameId: string,
  referenceDate = new Date()
) {
  const liveCutoff = getLiveServerCutoff(referenceDate)
  const fiveMinutesAgo = new Date(referenceDate.getTime() - 5 * 60 * 1000)
  const twentyFourHoursAgo = new Date(referenceDate.getTime() - 24 * 60 * 60 * 1000)

  const [lastEvent, liveServersNow, eventsLast5m, pendingModeration, failedModeration24h] =
    await Promise.all([
      prisma.gameLog.findFirst({
        where: { gameId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.liveServer.count({
        where: {
          gameId,
          lastHeartbeatAt: {
            gte: liveCutoff,
          },
        },
      }),
      prisma.gameLog.count({
        where: {
          gameId,
          createdAt: {
            gte: fiveMinutesAgo,
          },
        },
      }),
      prisma.sanction.count({
        where: {
          gameId,
          active: true,
          deliveryStatus: "PENDING",
        },
      }),
      prisma.sanction.count({
        where: {
          gameId,
          deliveryStatus: "FAILED",
          updatedAt: {
            gte: twentyFourHoursAgo,
          },
        },
      }),
    ])

  return {
    lastEventAt: lastEvent?.createdAt ?? null,
    liveServersNow,
    eventsLast5m,
    pendingModeration,
    failedModeration24h,
    health: getGameHealth({
      liveServersNow,
      eventsLast5m,
      failedModeration24h,
      pendingModeration,
      lastEventAt: lastEvent?.createdAt ?? null,
    }),
  }
}

export async function getGameSetupValidator(
  prisma: PrismaClient,
  gameId: string
) {
  const [
    latestWebhook,
    latestHeartbeat,
    latestPlayerJoin,
    actionPresenceRows,
  ] = await Promise.all([
    prisma.gameLog.findFirst({
      where: { gameId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.gameLog.findFirst({
      where: {
        gameId,
        event: {
          in: ["server_started", "server_heartbeat", "server_stopped"],
        },
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.gameLog.findFirst({
      where: {
        gameId,
        event: "player_join",
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.$queryRaw<ActionPresenceRow[]>`
      SELECT
        EXISTS(
          SELECT 1
          FROM "GameLog"
          WHERE "gameId" = ${gameId}
            AND event = 'player_action'
            AND payload->>'action' = 'economy'
        ) AS "hasEconomy",
        EXISTS(
          SELECT 1
          FROM "GameLog"
          WHERE "gameId" = ${gameId}
            AND event = 'player_action'
            AND payload->>'action' = 'progression'
        ) AS "hasProgression",
        EXISTS(
          SELECT 1
          FROM "GameLog"
          WHERE "gameId" = ${gameId}
            AND event = 'player_action'
            AND COALESCE(payload->>'action', '') NOT IN ('economy', 'progression', 'moderation_applied', 'moderation_failed')
        ) AS "hasCustomAction"
    `,
  ])

  const actionPresence = actionPresenceRows[0] ?? {
    hasEconomy: false,
    hasProgression: false,
    hasCustomAction: false,
  }

  const items: SetupValidatorItem[] = [
    {
      key: "webhook",
      label: "Webhook connected",
      status: latestWebhook ? "complete" : "missing",
      required: true,
      detail: latestWebhook
        ? "Dashblox already received at least one webhook event from this game."
        : "No webhook event received yet. Install the 3 files, enable HTTP requests, publish, and join once.",
    },
    {
      key: "heartbeat",
      label: "Server heartbeat received",
      status: latestHeartbeat ? "complete" : "missing",
      required: true,
      detail: latestHeartbeat
        ? "Dashblox already detected live server telemetry from Roblox."
        : "No live server signal yet. Start the game once after publishing.",
    },
    {
      key: "player_join",
      label: "Player join received",
      status: latestPlayerJoin ? "complete" : "missing",
      required: true,
      detail: latestPlayerJoin
        ? "A player joined event already reached Dashblox."
        : "Join the game once to let Dashblox confirm the player tracking flow.",
    },
    {
      key: "custom_event",
      label: "Custom event received",
      status: actionPresence.hasCustomAction ? "complete" : "missing",
      required: false,
      detail: actionPresence.hasCustomAction
        ? "At least one custom gameplay event has been tracked."
        : "Optional but recommended. Send one custom event to validate your own gameplay integration.",
    },
    {
      key: "economy",
      label: "Economy event received",
      status: actionPresence.hasEconomy ? "complete" : "missing",
      required: false,
      detail: actionPresence.hasEconomy
        ? "At least one economy event already reached Dashblox."
        : "Optional. Add one shop purchase, reward, or Robux purchase event when you are ready.",
    },
    {
      key: "progression",
      label: "Progression event received",
      status: actionPresence.hasProgression ? "complete" : "missing",
      required: false,
      detail: actionPresence.hasProgression
        ? "At least one progression event already reached Dashblox."
        : "Optional. Add one quest, tutorial, or milestone event later.",
    },
  ]

  const requiredItems = items.filter((item) => item.required)
  const completeItems = items.filter((item) => item.status === "complete")
  const completeRequiredItems = requiredItems.filter(
    (item) => item.status === "complete"
  )

  return {
    items,
    requiredItems,
    completeItems,
    completeRequiredItems,
    requiredComplete: completeRequiredItems.length === requiredItems.length,
    totalComplete: completeItems.length,
    totalCount: items.length,
  }
}
