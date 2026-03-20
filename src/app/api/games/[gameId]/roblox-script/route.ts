import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForRoute } from "@/lib/auth"
import {
  buildRobloxBootstrapScript,
  getRobloxBootstrapScriptFilename,
} from "@/lib/roblox-runtime"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForRoute(req, OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { gameId } = await params
    const { org } = currentOrgResult.context
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        orgId: org.id,
      },
      select: {
        id: true,
        name: true,
        webhookSecret: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const script = buildRobloxBootstrapScript({
      webhookUrl: `${appUrl}/api/webhook/${game.id}`,
      webhookSecret: game.webhookSecret,
      moderationUrl: `${appUrl}/api/webhook/${game.id}/moderation`,
      configUrl: `${appUrl}/api/webhook/${game.id}/config`,
    })

    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${getRobloxBootstrapScriptFilename(game.name)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[GET /api/games/[gameId]/roblox-script]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
