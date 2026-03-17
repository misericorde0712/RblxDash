import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { z } from "zod"
import { getCurrentOrgForApi } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"

const CreatePlayerNoteSchema = z.object({
  content: z.string().trim().min(1).max(2000),
})

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
        { error: "Select a game before adding player notes" },
        { status: 409 }
      )
    }

    const body = await req.json()
    const parsed = CreatePlayerNoteSchema.safeParse(body)

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

    const note = await prisma.playerNote.create({
      data: {
        gameId: currentGame.id,
        robloxId,
        content: parsed.data.content,
        authorId: dbUser.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
      },
    })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "player.note_added",
      targetType: "player",
      targetId: robloxId,
      payload: {
        gameId: currentGame.id,
        robloxId,
        username: player.username,
        displayName: player.displayName,
      },
    })

    return NextResponse.json({
      note: {
        ...note,
        authorLabel: dbUser.name ?? dbUser.email,
      },
    })
  } catch (err) {
    console.error("[POST /api/players/[robloxId]/notes]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
