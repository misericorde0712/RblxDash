import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { createAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import { getCurrentOrgForRoute } from "@/lib/auth"
import { toAbsoluteUrl } from "@/lib/request-url"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForRoute(req, OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { gameId } = await params
    const { dbUser, org } = currentOrgResult.context

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        orgId: org.id,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    await prisma.game.update({
      where: { id: game.id },
      data: {
        webhookSecret: randomBytes(32).toString("hex"),
      },
    })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "game.secret_rotated",
      targetType: "game",
      targetId: game.id,
      payload: {
        name: game.name,
      },
    })

    return NextResponse.redirect(
      toAbsoluteUrl(req, `/dashboard/games/${game.id}?rotated=1`),
      { status: 303 }
    )
  } catch (err) {
    console.error("[POST /api/games/[gameId]/rotate-secret]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
