import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { getServerPresenceFromPayload } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import { sendModerationFailedAlert } from "@/lib/discord"

const WebhookBodySchema = z.object({
  event: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  robloxId: z.string().optional(),
  username: z.string().optional(),
  displayName: z.string().optional(),
})

function getPayloadString(
  payload: Record<string, unknown>,
  key: string
) {
  const value = payload[key]
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params

    // Retrieve the game (with org for Discord webhook) and verify the webhook secret
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { org: { select: { name: true, discordWebhookUrl: true } } },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const incomingSecret = req.headers.get("x-webhook-secret")
    if (!incomingSecret || incomingSecret !== game.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = WebhookBodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      )
    }

    const { event, payload, robloxId, username, displayName } = parsed.data
    const receivedAt = new Date()
    const payloadRecord = payload as Record<string, unknown>
    const presence = getServerPresenceFromPayload(payloadRecord)
    const playerActionName =
      event === "player_action" ? getPayloadString(payloadRecord, "action") : null
    const normalizedEvent =
      playerActionName === "moderation_applied" ||
      playerActionName === "moderation_failed"
        ? playerActionName
        : event

    await prisma.$transaction(async (tx) => {
      await tx.gameLog.create({
        data: {
          gameId,
          event,
          payload: payload as Prisma.InputJsonValue,
          robloxId: robloxId ?? null,
        },
      })

      if (normalizedEvent === "server_stopped" && presence.jobId) {
        await tx.liveServer.deleteMany({
          where: {
            gameId,
            jobId: presence.jobId,
          },
        })

        await tx.trackedPlayer.updateMany({
          where: {
            gameId,
            currentServerJobId: presence.jobId,
            isOnline: true,
          },
          data: {
            isOnline: false,
            currentServerJobId: null,
            lastSessionEndedAt: receivedAt,
          },
        })
      } else if (presence.jobId) {
        const liveServerData = {
          lastHeartbeatAt: receivedAt,
          ...(presence.placeId ? { placeId: presence.placeId } : {}),
          ...(presence.region ? { region: presence.region } : {}),
          ...(presence.playerCount !== null
            ? { lastPlayerCount: presence.playerCount }
            : {}),
          ...(presence.playerIds !== null
            ? { lastPlayerIds: presence.playerIds }
            : {}),
          ...(event === "server_started" ? { startedAt: receivedAt } : {}),
        }

        if (
          normalizedEvent === "player_leave" ||
          normalizedEvent === "player_session_ended"
        ) {
          await tx.liveServer.updateMany({
            where: {
              gameId,
              jobId: presence.jobId,
            },
            data: liveServerData,
          })
        } else {
          await tx.liveServer.upsert({
            where: {
              gameId_jobId: {
                gameId,
                jobId: presence.jobId,
              },
            },
            update: liveServerData,
            create: {
              gameId,
              jobId: presence.jobId,
              placeId: presence.placeId,
              region: presence.region,
              startedAt: receivedAt,
              lastHeartbeatAt: receivedAt,
              lastPlayerCount: presence.playerCount ?? 0,
              lastPlayerIds: presence.playerIds ?? [],
            },
          })
        }
      }

      if (normalizedEvent === "server_stopped") {
        return
      }

      if (!robloxId) {
        return
      }

      const sharedPlayerFields = {
        lastSeenAt: receivedAt,
        ...(username ? { username } : {}),
        ...(displayName ? { displayName } : {}),
      }
      const createPlayerFields = {
        gameId,
        robloxId,
        username: username ?? null,
        displayName: displayName ?? null,
      }

      if (
        normalizedEvent === "player_join" ||
        normalizedEvent === "player_session_started"
      ) {
        await tx.trackedPlayer.upsert({
          where: {
            gameId_robloxId: { gameId, robloxId },
          },
          update: {
            ...sharedPlayerFields,
            isOnline: true,
            currentServerJobId: presence.jobId,
            lastSessionStartedAt: receivedAt,
          },
          create: {
            ...createPlayerFields,
            isOnline: true,
            currentServerJobId: presence.jobId,
            lastSessionStartedAt: receivedAt,
          },
        })
      } else if (
        normalizedEvent === "player_leave" ||
        normalizedEvent === "player_session_ended"
      ) {
        await tx.trackedPlayer.upsert({
          where: {
            gameId_robloxId: { gameId, robloxId },
          },
          update: {
            ...sharedPlayerFields,
            isOnline: false,
            currentServerJobId: null,
            lastSessionEndedAt: receivedAt,
          },
          create: {
            ...createPlayerFields,
            isOnline: false,
            currentServerJobId: null,
            lastSessionEndedAt: receivedAt,
          },
        })
      } else {
        await tx.trackedPlayer.upsert({
          where: {
            gameId_robloxId: { gameId, robloxId },
          },
          update: {
            ...sharedPlayerFields,
            ...(presence.jobId
              ? {
                  isOnline: true,
                  currentServerJobId: presence.jobId,
                }
              : {}),
          },
          create: {
            ...createPlayerFields,
            isOnline: Boolean(presence.jobId),
            currentServerJobId: presence.jobId,
          },
        })
      }

      if (
        normalizedEvent === "moderation_applied" ||
        normalizedEvent === "moderation_failed"
      ) {
        const sanctionId = getPayloadString(payloadRecord, "sanctionId")
        if (!sanctionId) {
          return
        }

        const deliveryError =
          getPayloadString(payloadRecord, "message") ??
          getPayloadString(payloadRecord, "error")

        const sanction = await tx.sanction.findFirst({
          where: { id: sanctionId, gameId, robloxId },
          select: { type: true, reason: true },
        })

        await tx.sanction.updateMany({
          where: {
            id: sanctionId,
            gameId,
            robloxId,
          },
          data: {
            deliveryStatus:
              normalizedEvent === "moderation_applied" ? "APPLIED" : "FAILED",
            deliveredAt: receivedAt,
            deliveryDetails: deliveryError,
          },
        })

        // Alerte Discord si la livraison a échoué et que l'org a configuré un webhook
        if (normalizedEvent === "moderation_failed" && game.org.discordWebhookUrl && sanction) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
          sendModerationFailedAlert({
            webhookUrl: game.org.discordWebhookUrl,
            gameName: game.name,
            sanctionType: sanction.type,
            robloxId,
            username,
            reason: sanction.reason,
            error: deliveryError,
            appUrl,
          }).catch(() => null)
        }
      }
    })

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error("[POST /api/webhook/[gameId]]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
