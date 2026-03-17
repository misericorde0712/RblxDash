import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import {
  fetchUniverseInfo,
  resolveUniverseIdFromPlaceId,
} from "@/lib/roblox-open-cloud"

/**
 * GET /api/roblox/universe/lookup?placeId=xxx
 *
 * Auto-fills game name, Universe ID and icon when a dev enters a Place ID.
 * Requires scope: universe:read
 */
export async function GET(req: NextRequest) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { dbUser } = currentOrgResult.context

    const placeId = req.nextUrl.searchParams.get("placeId")?.trim()
    if (!placeId || !/^\d+$/.test(placeId)) {
      return NextResponse.json({ error: "Invalid Place ID" }, { status: 400 })
    }

    // Step 1 — resolve universeId (public, no auth needed)
    const universeId = await resolveUniverseIdFromPlaceId(placeId)
    if (!universeId) {
      return NextResponse.json(
        { error: "Place not found on Roblox" },
        { status: 404 }
      )
    }

    // Step 2 — try to fetch universe details with OAuth token
    const tokenResult = await ensureRobloxAccessToken(dbUser.id)
    if (!tokenResult) {
      // Return just the universeId without extra details if no OAuth connection
      return NextResponse.json({ universeId, name: null, iconUrl: null })
    }

    const hasUniverseReadScope = tokenResult.connection.scopes.includes("universe:read")
    if (!hasUniverseReadScope) {
      return NextResponse.json({ universeId, name: null, iconUrl: null })
    }

    const universeInfo = await fetchUniverseInfo(tokenResult.accessToken, universeId)
    if (!universeInfo) {
      return NextResponse.json({ universeId, name: null, iconUrl: null })
    }

    return NextResponse.json({
      universeId: universeInfo.universeId,
      name: universeInfo.name || null,
      iconUrl: universeInfo.iconUrl,
    })
  } catch (err) {
    console.error("[GET /api/roblox/universe/lookup]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
