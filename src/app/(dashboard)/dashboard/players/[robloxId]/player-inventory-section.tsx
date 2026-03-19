"use client"

import { useEffect, useState } from "react"

type InventoryItem = {
  type: "gamePass" | "badge" | "asset"
  id: string
  name: string | null
}

function ItemTypeBadge({ type }: { type: InventoryItem["type"] }) {
  if (type === "gamePass") {
    return (
      <span className="rounded-full border border-violet-800 bg-violet-950/60 px-2 py-0.5 text-[11px] font-medium text-violet-300">
        Game Pass
      </span>
    )
  }
  if (type === "badge") {
    return (
      <span className="rounded-full border border-yellow-800 bg-yellow-950/60 px-2 py-0.5 text-[11px] font-medium text-yellow-300">
        Badge
      </span>
    )
  }
  return (
    <span className="rounded-full border border-gray-700 bg-gray-900 px-2 py-0.5 text-[11px] font-medium text-gray-400">
      Asset
    </span>
  )
}

export default function PlayerInventorySection({
  robloxId,
  hasUniverseId,
}: {
  robloxId: string
  hasUniverseId: boolean
}) {
  const [items, setItems] = useState<InventoryItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(hasUniverseId)

  useEffect(() => {
    if (!hasUniverseId) {
      return
    }

    fetch(`/api/players/${encodeURIComponent(robloxId)}/inventory`)
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string }
          setError(data.error ?? "Failed to load inventory")
          return
        }
        const data = (await res.json()) as { items: InventoryItem[] }
        setItems(data.items)
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false))
  }, [robloxId, hasUniverseId])

  if (!hasUniverseId) {
    return (
      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white">Roblox inventory</h2>
        <p className="mt-3 text-sm text-gray-500">
          Configure a Universe ID on the game to enable inventory lookup.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Roblox inventory</h2>
        <p className="mt-1 text-xs text-gray-500">
          Game passes and badges owned by this player in your universe.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading inventory...</p>
      ) : error ? (
        <p className="text-sm text-amber-400">{error}</p>
      ) : !items || items.length === 0 ? (
        <p className="text-sm text-gray-500">
          No game passes or badges found for this player.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/60 px-3 py-2.5"
            >
              <p className="text-sm text-gray-200">{item.name ?? item.id}</p>
              <ItemTypeBadge type={item.type} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
