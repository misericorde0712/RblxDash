import "server-only"

const GAMES_API_BASE = "https://games.roblox.com"
const THUMBNAILS_API_BASE = "https://thumbnails.roblox.com"

export type RobloxPublicServer = {
  id: string
  maxPlayers: number
  playing: number
  fps: number
  ping: number
  playerTokens: string[]
}

type RobloxPublicServersResponse = {
  data: RobloxPublicServer[]
  nextPageCursor?: string | null
}

export type PlayerThumbnail = {
  targetId: string
  imageUrl: string | null
  state: string
}

export async function fetchPublicServers(
  universeId: string,
  cursor?: string
): Promise<RobloxPublicServersResponse | null> {
  try {
    const url = new URL(
      `${GAMES_API_BASE}/v1/games/${universeId}/servers/Public`
    )
    url.searchParams.set("limit", "100")
    url.searchParams.set("sortOrder", "Desc")
    url.searchParams.set("excludeFullGames", "false")
    if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const res = await fetch(url.toString(), { cache: "no-store" })
    if (!res.ok) return null

    return (await res.json()) as RobloxPublicServersResponse
  } catch {
    return null
  }
}

export async function fetchAllPublicServers(
  universeId: string
): Promise<RobloxPublicServer[]> {
  const allServers: RobloxPublicServer[] = []
  let cursor: string | undefined
  let pages = 0
  const maxPages = 5

  while (pages < maxPages) {
    const result = await fetchPublicServers(universeId, cursor)
    if (!result || result.data.length === 0) break

    allServers.push(...result.data)
    pages++

    if (!result.nextPageCursor) break
    cursor = result.nextPageCursor
  }

  return allServers
}

export async function fetchPlayerThumbnails(
  userIds: string[]
): Promise<Map<string, string>> {
  const thumbnailMap = new Map<string, string>()
  if (userIds.length === 0) return thumbnailMap

  const batchSize = 100

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize)

    try {
      const url = new URL(
        `${THUMBNAILS_API_BASE}/v1/users/avatar-headshot`
      )
      url.searchParams.set("userIds", batch.join(","))
      url.searchParams.set("size", "48x48")
      url.searchParams.set("format", "Png")
      url.searchParams.set("isCircular", "false")

      const res = await fetch(url.toString(), { cache: "no-store" })
      if (!res.ok) continue

      const data = (await res.json()) as {
        data?: PlayerThumbnail[]
      }

      for (const entry of data.data ?? []) {
        if (entry.imageUrl && entry.state === "Completed") {
          thumbnailMap.set(String(entry.targetId), entry.imageUrl)
        }
      }
    } catch {
      // thumbnails are optional
    }
  }

  return thumbnailMap
}
