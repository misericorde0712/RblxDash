import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getSanctionPriority,
  isSanctionCurrentlyActive,
} from "@/lib/player-moderation"
import { prisma } from "@/lib/prisma"

const ModerationQuerySchema = z.object({
  robloxId: z.string().min(1),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        webhookSecret: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const incomingSecret = req.headers.get("x-webhook-secret")
    if (!incomingSecret || incomingSecret !== game.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parsedQuery = ModerationQuerySchema.safeParse({
      robloxId: req.nextUrl.searchParams.get("robloxId"),
    })

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: parsedQuery.error.issues[0]?.message ?? "Invalid query" },
        { status: 400 }
      )
    }

    const now = new Date()
    const { robloxId } = parsedQuery.data

    await prisma.sanction.updateMany({
      where: {
        gameId,
        robloxId,
        active: true,
        expiresAt: {
          lte: now,
        },
      },
      data: {
        active: false,
      },
    })

    const [player, sanctions] = await Promise.all([
      prisma.trackedPlayer.findUnique({
        where: {
          gameId_robloxId: {
            gameId,
            robloxId,
          },
        },
        select: {
          robloxId: true,
          username: true,
          displayName: true,
        },
      }),
      prisma.sanction.findMany({
        where: {
          gameId,
          robloxId,
          active: true,
        },
        select: {
          id: true,
          type: true,
          reason: true,
          createdAt: true,
          expiresAt: true,
          active: true,
        },
      }),
    ])

    const activeSanctions = sanctions
      .filter((sanction) => isSanctionCurrentlyActive(sanction, now))
      .sort((left, right) => {
        const priorityDifference =
          getSanctionPriority(left.type) - getSanctionPriority(right.type)

        if (priorityDifference !== 0) {
          return priorityDifference
        }

        return right.createdAt.getTime() - left.createdAt.getTime()
      })
    const kickIdsToConsume = activeSanctions
      .filter((sanction) => sanction.type === "KICK")
      .map((sanction) => sanction.id)

    if (kickIdsToConsume.length > 0) {
      await prisma.sanction.updateMany({
        where: {
          id: {
            in: kickIdsToConsume,
          },
        },
        data: {
          active: false,
        },
      })
    }

    return NextResponse.json(
      {
        player: player ?? {
          robloxId,
          username: null,
          displayName: null,
        },
        sanctions: activeSanctions.map((sanction) => ({
          id: sanction.id,
          type: sanction.type,
          reason: sanction.reason,
          createdAt: sanction.createdAt,
          expiresAt: sanction.expiresAt,
        })),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    )
  } catch (err) {
    console.error("[GET /api/webhook/[gameId]/moderation]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
