import "server-only"

const OPEN_CLOUD_BASE = "https://apis.roblox.com"
const DATASTORE_NAME = "RblxDash_Bans"

// ─── Types ────────────────────────────────────────────────────────────────────

export type RobloxUniverseInfo = {
  universeId: string
  name: string
  description: string | null
  iconUrl: string | null
  creatorName: string | null
}

export type RobloxInventoryItem = {
  type: "gamePass" | "badge" | "asset"
  id: string
  name: string | null
}

export type DataStoreBanPayload = {
  banned: boolean
  reason: string
  moderator: string
  bannedAt: string
  expiresAt: string | null
}

// ─── Universe ─────────────────────────────────────────────────────────────────

/**
 * Resolve a Roblox Place ID → Universe ID using the public API (no auth needed).
 */
export async function resolveUniverseIdFromPlaceId(placeId: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${OPEN_CLOUD_BASE}/universes/v1/places/${placeId}/universe`,
      { cache: "no-store" }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { universeId?: number }
    return data.universeId != null ? String(data.universeId) : null
  } catch {
    return null
  }
}

/**
 * Fetch universe name, description and icon using the OAuth access token.
 * Requires scope: universe:read
 */
export async function fetchUniverseInfo(
  accessToken: string,
  universeId: string
): Promise<RobloxUniverseInfo | null> {
  try {
    const res = await fetch(
      `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }
    )
    if (!res.ok) return null

    const data = (await res.json()) as {
      displayName?: string
      description?: string
      user?: { displayName?: string }
      group?: { displayName?: string }
    }

    // Thumbnail is a separate endpoint in Open Cloud v2
    let iconUrl: string | null = null
    try {
      const thumbRes = await fetch(
        `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}/thumbnails?universeId=${universeId}&size=150x150&format=Png&isCircular=false`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        }
      )
      if (thumbRes.ok) {
        const thumbData = (await thumbRes.json()) as {
          data?: { imageUrl?: string }[]
        }
        iconUrl = thumbData.data?.[0]?.imageUrl ?? null
      }
    } catch {
      // thumbnail is optional, keep null
    }

    const creatorName =
      data.user?.displayName ?? data.group?.displayName ?? null

    return {
      universeId,
      name: data.displayName ?? "",
      description: data.description ?? null,
      iconUrl,
      creatorName,
    }
  } catch {
    return null
  }
}

// ─── DataStore bans ───────────────────────────────────────────────────────────

/**
 * Write a ban entry to the RblxDash_Bans DataStore.
 * Requires scope: universe-datastores:write
 */
export async function writeDataStoreBan(
  accessToken: string,
  universeId: string,
  robloxId: string,
  payload: DataStoreBanPayload
): Promise<void> {
  const url = new URL(
    `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry`
  )
  url.searchParams.set("datastoreName", DATASTORE_NAME)
  url.searchParams.set("entryKey", robloxId)

  const body = JSON.stringify(payload)

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "content-md5": Buffer.from(body).toString("base64"),
    },
    body,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error")
    throw new Error(`DataStore write failed (${res.status}): ${text}`)
  }
}

/**
 * Delete a ban entry from the RblxDash_Bans DataStore.
 * Requires scope: universe-datastores:write
 */
export async function deleteDataStoreBan(
  accessToken: string,
  universeId: string,
  robloxId: string
): Promise<void> {
  const url = new URL(
    `${OPEN_CLOUD_BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry`
  )
  url.searchParams.set("datastoreName", DATASTORE_NAME)
  url.searchParams.set("entryKey", robloxId)

  await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  }).catch(() => undefined)
}

// ─── Player inventory ─────────────────────────────────────────────────────────

type InventoryResponse = {
  inventoryItems?: {
    assetDetails?: { assetId?: string; assetType?: string; name?: string }
    gamePassDetails?: { gamePassId?: string; name?: string }
    badgeDetails?: { badgeId?: string; name?: string }
  }[]
  nextPageToken?: string
}

/**
 * Fetch a player's game passes and badges for a specific universe.
 * Requires scope: user.inventory-item:read
 */
export async function fetchPlayerInventory(
  accessToken: string,
  robloxUserId: string,
  universeId: string
): Promise<RobloxInventoryItem[]> {
  const items: RobloxInventoryItem[] = []

  // Fetch game passes for this universe
  try {
    const url = new URL(
      `${OPEN_CLOUD_BASE}/cloud/v2/users/${robloxUserId}/inventory-items`
    )
    url.searchParams.set("filter", `universeId=${universeId}`)
    url.searchParams.set("limit", "50")

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (res.ok) {
      const data = (await res.json()) as InventoryResponse
      for (const item of data.inventoryItems ?? []) {
        if (item.gamePassDetails) {
          items.push({
            type: "gamePass",
            id: item.gamePassDetails.gamePassId ?? "",
            name: item.gamePassDetails.name ?? null,
          })
        } else if (item.badgeDetails) {
          items.push({
            type: "badge",
            id: item.badgeDetails.badgeId ?? "",
            name: item.badgeDetails.name ?? null,
          })
        }
      }
    }
  } catch {
    // fail silently — inventory is optional context
  }

  return items
}

// ─── MessagingService ────────────────────────────────────────────────────────

/**
 * Publish a message to a MessagingService topic in a Roblox universe.
 * Requires scope: universe-messaging-service:publish
 *
 * Note: Roblox limits messages to 1KB and 150 requests/min per universe.
 */
export async function publishMessagingServiceMessage(
  accessToken: string,
  universeId: string,
  topic: string,
  message: string
): Promise<void> {
  const url = `${OPEN_CLOUD_BASE}/cloud/v2/universes/${universeId}/topics/${encodeURIComponent(topic)}:publish`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error")
    throw new Error(`MessagingService publish failed (${res.status}): ${text}`)
  }
}
