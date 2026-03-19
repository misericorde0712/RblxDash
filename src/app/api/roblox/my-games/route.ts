import { NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

    // Fetch user games and groups in parallel
    const [userGames, groups] = await Promise.all([
      fetchGamesForUser(userId),
      fetchUserGroups(userId),
    ])

    // Fetch games from all groups in parallel (limit to first 10 groups)
    const groupGameResults = await Promise.all(
      groups.slice(0, 10).map((gr) => fetchGamesForGroup(gr.group.id, gr.group.name))
    )

    // Combine and deduplicate by placeId
    const allGames = [...userGames, ...groupGameResults.flat()]
    const seen = new Set<string>()
    const dedupedGames: GameEntry[] = []
    for (const game of allGames) {
      if (!seen.has(game.placeId)) {
        seen.add(game.placeId)
        dedupedGames.push(game)
      }
    }

    console.log("[my-games] userId:", userId, "userGames:", userGames.length, "groups:", groups.map(g => `${g.group.name}(${g.group.id})`), "groupGames:", groupGameResults.map(r => r.length), "total:", dedupedGames.length)

    return NextResponse.json({ games: dedupedGames })
  } catch (err) {
    console.error("[GET /api/roblox/my-games]", err)
    return NextResponse.json({ games: [] })
  }
}
