import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import { fetchPlayerInventory } from "@/lib/roblox-open-cloud"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/players/[robloxId]/inventory
 *
 * Fetches game passes and badges for a player in the current game universe.
 * Requires scope: user.inventory-item:read
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ robloxId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { dbUser, currentGame } = currentOrgResult.context
    const { robloxId } = await params

    if (!currentGame) {
      return NextResponse.json(
        { error: "No active game selected" },
        { status: 409 }
      )
    }

    // Find the Roblox connection for the game owner (robloxConnectionId on game)
    const game = await prisma.game.findUnique({
      where: { id: currentGame.id },
      select: {
        robloxUniverseId: true,
        robloxConnection: {
          select: { userId: true, scopes: true },
        },
      },
    })

    if (!game?.robloxUniverseId) {
      return NextResponse.json(
        { error: "Game has no Universe ID configured" },
        { status: 400 }
      )
    }

    // Fall back to the current user's OAuth connection if game has none
    const connectionUserId =
      game?.robloxConnection?.userId ?? dbUser.id

    const tokenResult = await ensureRobloxAccessToken(connectionUserId)
    if (!tokenResult) {
      return NextResponse.json(
        { error: "No Roblox account connected" },
        { status: 400 }
      )
    }

    const hasScope = tokenResult.connection.scopes.includes("user.inventory-item:read")
    if (!hasScope) {
      return NextResponse.json(
        { error: "Roblox account not authorized for inventory access. Reconnect to grant the new scope." },
        { status: 403 }
      )
    }

    const items = await fetchPlayerInventory(
      tokenResult.accessToken,
      robloxId,
      game!.robloxUniverseId!
    )

    return NextResponse.json({ items })
  } catch (err) {
    console.error("[GET /api/players/[robloxId]/inventory]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
