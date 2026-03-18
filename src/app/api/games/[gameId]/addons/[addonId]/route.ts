/**
 * GET /api/games/[gameId]/addons/[addonId]
 *
 * Downloads an add-on Luau module for a specific game.
 * Currently supported add-ons: "live-config"
 */

import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForRoute } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  ADDONS,
  buildLiveConfigAddon,
  getLiveConfigAddonFilename,
  buildLiveEventsAddon,
  getLiveEventsAddonFilename,
  type AddonId,
} from "@/lib/roblox-addons"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; addonId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForRoute(req, OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { gameId, addonId } = await params
    const { org } = currentOrgResult.context

    if (!ADDONS[addonId as AddonId]) {
      return NextResponse.json(
        { error: `Unknown add-on: ${addonId}` },
        { status: 404 }
      )
    }

    const game = await prisma.game.findFirst({
      where: { id: gameId, orgId: org.id },
      select: { id: true, name: true, webhookSecret: true },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!

    if (addonId === "live-config") {
      const script = buildLiveConfigAddon({
        configUrl: `${appUrl}/api/webhook/${game.id}/config`,
        webhookSecret: game.webhookSecret,
      })

      return new NextResponse(script, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${getLiveConfigAddonFilename(game.name)}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    if (addonId === "live-events") {
      const script = buildLiveEventsAddon({
        eventsUrl: `${appUrl}/api/webhook/${game.id}/events`,
        webhookSecret: game.webhookSecret,
      })

      return new NextResponse(script, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${getLiveEventsAddonFilename(game.name)}"`,
          "Cache-Control": "no-store",
        },
      })
    }

    return NextResponse.json({ error: "Add-on not implemented" }, { status: 501 })
  } catch (err) {
    console.error("[GET /api/games/[gameId]/addons/[addonId]]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
