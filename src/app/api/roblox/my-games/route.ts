import { NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import { getRobloxOAuthConfig } from "@/lib/roblox-oauth"
import { createLogger } from "@/lib/logger"

const log = createLogger("roblox/my-games")

type RobloxGame = {
  id: number
  rootPlaceId?: number
  rootPlace?: { id: number }
  name: string
  placeVisits: number
}

type RobloxGroupRole = {
  group: { id: number; name: string }
}

type GameEntry = {
  universeId: string
  placeId: string
  name: string
  placeVisits: number
  source: string
}

function getPlaceId(g: RobloxGame): string {
  return String(g.rootPlaceId ?? g.rootPlace?.id ?? "")
}

// ─── Authenticated fetch (OAuth token resources) ────────────────────────────

type TokenResourceInfo = {
  owner: { id: string; type: string }
  resources: {
    universe?: { ids: string[] }
    [key: string]: { ids: string[] } | undefined
  }
}

async function fetchAuthorizedUniverseIds(accessToken: string): Promise<string[]> {
  const config = getRobloxOAuthConfig()
  if (!config) return []

  const body = new URLSearchParams({
    token: accessToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const res = await fetch("https://apis.roblox.com/oauth/v1/token/resources", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    cache: "no-store",
  })

  if (!res.ok) {
    log.info("Token resources fetch failed", { status: res.status })
    return []
  }

  const data = (await res.json()) as { resource_infos?: TokenResourceInfo[] }
  const universeIds: string[] = []

  for (const info of data.resource_infos ?? []) {
    for (const id of info.resources?.universe?.ids ?? []) {
      // "U" means all universes owned by the user — skip it, we'll get those from the public API
      if (id !== "U") {
        universeIds.push(id)
      }
    }
  }

  return universeIds
}

async function fetchUniverseDetails(universeIds: string[]): Promise<GameEntry[]> {
  if (universeIds.length === 0) return []

  // Roblox public API accepts comma-separated universe IDs (up to 100)
  const res = await fetch(
    `https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`,
    { cache: "no-store" }
  )

  if (!res.ok) return []

  const data = (await res.json()) as { data?: RobloxGame[] }
  return (data.data ?? []).map((g) => ({
    universeId: String(g.id),
    placeId: getPlaceId(g),
    name: g.name,
    placeVisits: g.placeVisits ?? 0,
    source: "oauth",
  }))
}

async function fetchGamesWithOAuth(
  _robloxUserId: string,
  accessToken: string
): Promise<GameEntry[]> {
  const universeIds = await fetchAuthorizedUniverseIds(accessToken)
  if (universeIds.length === 0) return []

  log.info("OAuth authorized universes found", { count: universeIds.length, universeIds })

  return fetchUniverseDetails(universeIds)
}

// ─── Public API fallback (no auth needed) ───────────────────────────────────

async function fetchGamesForUser(userId: string): Promise<GameEntry[]> {
  const res = await fetch(
    `https://games.roblox.com/v2/users/${userId}/games?sortOrder=Desc&limit=50`,
    { cache: "no-store" }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { data?: RobloxGame[] }
  return (data.data ?? []).filter((g) => getPlaceId(g)).map((g) => ({
    universeId: String(g.id),
    placeId: getPlaceId(g),
    name: g.name,
    placeVisits: g.placeVisits ?? 0,
    source: "user",
  }))
}

async function fetchGamesForGroup(groupId: number, groupName: string): Promise<GameEntry[]> {
  const res = await fetch(
    `https://games.roblox.com/v2/groups/${groupId}/games?sortOrder=Desc&limit=50`,
    { cache: "no-store" }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { data?: RobloxGame[] }
  return (data.data ?? []).filter((g) => getPlaceId(g)).map((g) => ({
    universeId: String(g.id),
    placeId: getPlaceId(g),
    name: g.name,
    placeVisits: g.placeVisits ?? 0,
    source: groupName,
  }))
}

async function fetchUserGroups(userId: string): Promise<RobloxGroupRole[]> {
  const res = await fetch(
    `https://groups.roblox.com/v2/users/${userId}/groups/roles`,
    { cache: "no-store" }
  )
  if (!res.ok) return []
  const data = (await res.json()) as { data?: RobloxGroupRole[] }
  return data.data ?? []
}

export async function GET() {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) return currentOrgResult.response

    const { dbUser } = currentOrgResult.context

    const robloxConnection = await prisma.robloxConnection.findUnique({
      where: { userId: dbUser.id },
      select: { robloxUserId: true },
    })

    if (!robloxConnection) {
      return NextResponse.json({ games: [] })
    }

    const userId = robloxConnection.robloxUserId

    // Try OAuth-authenticated fetch first (sees all authorized games including private)
    let oauthGames: GameEntry[] = []
    const tokenResult = await ensureRobloxAccessToken(dbUser.id)
    if (tokenResult) {
      oauthGames = await fetchGamesWithOAuth(userId, tokenResult.accessToken)
    }

    // Also fetch from public API (groups + public user games)
    const [publicUserGames, groups] = await Promise.all([
      fetchGamesForUser(userId),
      fetchUserGroups(userId),
    ])

    const groupGameResults = await Promise.all(
      groups.slice(0, 10).map((gr) => fetchGamesForGroup(gr.group.id, gr.group.name))
    )

    // Combine: OAuth games first, then public, then groups — deduplicate by universeId
    const allGames = [...oauthGames, ...publicUserGames, ...groupGameResults.flat()]
    const seen = new Set<string>()
    const dedupedGames: GameEntry[] = []
    for (const game of allGames) {
      const key = game.universeId || game.placeId
      if (key && !seen.has(key)) {
        seen.add(key)
        dedupedGames.push(game)
      }
    }

    log.info("Games fetched", {
      userId,
      oauthGames: oauthGames.length,
      publicGames: publicUserGames.length,
      groups: groups.length,
      total: dedupedGames.length,
    })

    return NextResponse.json({ games: dedupedGames })
  } catch (err) {
    log.error("Failed to fetch games", {}, err instanceof Error ? err : undefined)
    return NextResponse.json({ games: [] })
  }
}
