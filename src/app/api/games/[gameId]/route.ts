import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { createAuditLog } from "@/lib/audit-log"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params

    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) return currentOrgResult.response

    const { dbUser, org } = currentOrgResult.context

    const game = await prisma.game.findFirst({
      where: { id: gameId, orgId: org.id },
      select: { id: true, name: true },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    await prisma.game.delete({ where: { id: gameId } })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "game.deleted",
      targetType: "game",
      targetId: gameId,
      payload: { name: game.name },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[DELETE /api/games/[gameId]]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
