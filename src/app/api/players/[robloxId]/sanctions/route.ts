import { NextRequest, NextResponse } from "next/server"
import { OrgRole, SanctionType } from "@prisma/client"
import { z } from "zod"
import { getCurrentOrgForApi } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  formatSanctionType,
  getSanctionExpiresAt,
} from "@/lib/player-moderation"
import { prisma } from "@/lib/prisma"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import { writeDataStoreBan, deleteDataStoreBan } from "@/lib/roblox-open-cloud"

const CreateSanctionSchema = z
  .object({
    type: z.nativeEnum(SanctionType),
    reason: z
      .string()
      .trim()
      .min(5, "Reason must be at least 5 characters")
      .max(500),
    durationMinutes: z.number().int().positive().max(60 * 24 * 365).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.type === "TIMEOUT" && !value.durationMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationMinutes"],
        message: "Timeout duration is required",
      })
    }

    if ((value.type === "KICK" || value.type === "UNBAN") && value.durationMinutes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationMinutes"],
        message: "Duration is not used for this action",
      })
    }
  })

function formatModeratorLabel(name: string | null, email: string) {
  return name?.trim() || email
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ robloxId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { robloxId } = await params
    const { dbUser, org, currentGame } = currentOrgResult.context

    if (!currentGame) {
      return NextResponse.json(
        { error: "Select a game before moderating a player" },
        { status: 409 }
      )
    }

    const body = await req.json()
    const parsed = CreateSanctionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const player = await prisma.trackedPlayer.findUnique({
      where: {
        gameId_robloxId: {
          gameId: currentGame.id,
          robloxId,
        },
      },
      select: {
        robloxId: true,
        username: true,
        displayName: true,
      },
    })

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    const now = new Date()
    const moderatorLabel = formatModeratorLabel(dbUser.name, dbUser.email)
    const { type, reason, durationMinutes = null } = parsed.data

    const sanction = await prisma.$transaction(async (tx) => {
      if (type === "UNBAN") {
        const activeRestrictions = await tx.sanction.findMany({
          where: {
            gameId: currentGame.id,
            robloxId,
            active: true,
            type: {
              in: ["BAN", "TIMEOUT"],
            },
          },
          select: {
            id: true,
          },
        })

        if (activeRestrictions.length === 0) {
          throw new Error("NO_ACTIVE_RESTRICTION")
        }

        await tx.sanction.updateMany({
          where: {
            id: {
              in: activeRestrictions.map((entry) => entry.id),
            },
          },
          data: {
            active: false,
          },
        })

        return tx.sanction.create({
          data: {
            gameId: currentGame.id,
            robloxId,
            type,
            reason,
            active: false,
            moderator: moderatorLabel,
          },
        })
      }

      if (type === "BAN" || type === "TIMEOUT") {
        await tx.sanction.updateMany({
          where: {
            gameId: currentGame.id,
            robloxId,
            active: true,
            type: {
              in: ["BAN", "TIMEOUT"],
            },
          },
          data: {
            active: false,
          },
        })
      }

      return tx.sanction.create({
        data: {
          gameId: currentGame.id,
          robloxId,
          type,
          reason,
          active: true,
          expiresAt: getSanctionExpiresAt({
            type,
            durationMinutes,
            referenceDate: now,
          }),
          moderator: moderatorLabel,
        },
      })
    })

    // ── Persistent DataStore ban (fire-and-forget) ───────────────────────────
    if (type === "BAN" || type === "UNBAN") {
      const game = await prisma.game.findUnique({
        where: { id: currentGame.id },
        select: {
          robloxUniverseId: true,
          robloxConnection: { select: { userId: true, scopes: true } },
        },
      })
      const connectionUserId = game?.robloxConnection?.userId ?? dbUser.id
      const tokenResult = await ensureRobloxAccessToken(connectionUserId).catch(() => null)

      if (
        tokenResult &&
        tokenResult.connection.scopes.includes("universe-datastores:write") &&
        game?.robloxUniverseId
      ) {
        if (type === "BAN") {
          writeDataStoreBan(
            tokenResult.accessToken,
            game.robloxUniverseId,
            robloxId,
            {
              banned: true,
              reason,
              moderator: moderatorLabel,
              bannedAt: now.toISOString(),
              expiresAt: null,
            }
          ).catch((err) =>
            console.warn("[sanctions] DataStore ban write failed:", err)
          )
        } else if (type === "UNBAN") {
          deleteDataStoreBan(
            tokenResult.accessToken,
            game.robloxUniverseId,
            robloxId
          ).catch((err) =>
            console.warn("[sanctions] DataStore ban delete failed:", err)
          )
        }
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "player.sanction_added",
      targetType: "player",
      targetId: robloxId,
      payload: {
        gameId: currentGame.id,
        robloxId,
        username: player.username,
        displayName: player.displayName,
        type,
        reason,
        durationMinutes,
      },
    })

    return NextResponse.json({
      sanction: {
        id: sanction.id,
        type: sanction.type,
        reason: sanction.reason,
        active: sanction.active,
        createdAt: sanction.createdAt,
        updatedAt: sanction.updatedAt,
        expiresAt: sanction.expiresAt,
        moderator: sanction.moderator,
        deliveryStatus: sanction.deliveryStatus,
        deliveredAt: sanction.deliveredAt,
        deliveryDetails: sanction.deliveryDetails,
        label: formatSanctionType(sanction.type),
      },
    })
  } catch (err) {
    if (err instanceof Error && err.message === "NO_ACTIVE_RESTRICTION") {
      return NextResponse.json(
        { error: "This player does not have an active ban or timeout" },
        { status: 409 }
      )
    }

    console.error("[POST /api/players/[robloxId]/sanctions]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
