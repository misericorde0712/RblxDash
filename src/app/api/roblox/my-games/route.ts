import { NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
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

// ─── Authenticated fetch (OAuth token) ──────────────────────────────────────

type OpenCloudUniverse = {
  path: string
  displayName: string
  createTime?: string
  updateTime?: string
  rootPlacePath?: string
}

async function fetchGamesWithOAuth(
  robloxUserId: string,
  accessToken: string
): Promise<GameEntry[]> {
  const games: GameEntry[] = []
  let nextPageToken: string | undefined

  for (let page = 0; page < 5; page++) {
    const url = new URL(
      `https://apis.roblox.com/cloud/v2/users/${robloxUserId}/universes`
    )
    url.searchParams.set("maxPageSize", "50")
    if (nextPageToken) url.searchParams.set("pageToken", nextPageToken)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!res.ok) {
      log.info("OAuth universe fetch failed, falling back to public API", {
        status: res.status,
      })
      return []
    }

    const data = (await res.json()) as {
      universes?: OpenCloudUniverse[]
      nextPageToken?: string
    }

    for (const u of data.universes ?? []) {
      // path format: "universes/123"
      const universeId = u.path?.split("/")[1] ?? ""
      // rootPlacePath format: "universes/123/places/456"
      const placeId = u.rootPlacePath?.split("/")[3] ?? ""
      if (universeId) {
        games.push({
          universeId,
          placeId,
          name: u.displayName || `Universe ${universeId}`,
          placeVisits: 0,
          source: "oauth",
        })
      }
    }

    nextPageToken = data.nextPageToken
    if (!nextPageToken) break
  }

  return games
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
