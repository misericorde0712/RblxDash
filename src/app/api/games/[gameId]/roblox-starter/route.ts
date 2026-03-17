import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForRoute } from "@/lib/auth"
import {
  buildRobloxStarterModuleScript,
  getRobloxStarterModuleFilename,
  isRobloxStarterTemplateId,
} from "@/lib/roblox-starter-modules"
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

    const templateId = req.nextUrl.searchParams.get("template")
    if (!templateId || !isRobloxStarterTemplateId(templateId)) {
      return NextResponse.json(
        { error: "Invalid starter template" },
        { status: 400 }
      )
    }

    const { gameId } = await params
    const { org } = currentOrgResult.context
    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        orgId: org.id,
      },
      select: {
        name: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const moduleScript = buildRobloxStarterModuleScript({
      templateId,
    })

    return new NextResponse(moduleScript, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${getRobloxStarterModuleFilename(game.name, templateId)}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    console.error("[GET /api/games/[gameId]/roblox-starter]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
