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
      <span
        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" }}
      >
        Game Pass
      </span>
    )
  }
  if (type === "badge") {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[11px] font-medium"
        style={{ background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", color: "#fde68a" }}
      >
        Badge
      </span>
    )
  }
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.15)", color: "#9ca3af" }}
    >
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
    if (!hasUniverseId) return

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
      <section className="rd-card p-5">
        <h2 className="text-base font-semibold text-white">Roblox inventory</h2>
        <p className="mt-3 text-sm" style={{ color: "#666666" }}>
          Configure a Universe ID on the game to enable inventory lookup.
        </p>
      </section>
    )
  }

  return (
    <section className="rd-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">Roblox inventory</h2>
        <p className="mt-1 text-xs" style={{ color: "#666666" }}>
          Game passes and badges owned by this player in your universe.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "#666666" }}>Loading inventory...</p>
      ) : error ? (
        <p className="text-sm" style={{ color: "#f59e0b" }}>{error}</p>
      ) : !items || items.length === 0 ? (
        <p className="text-sm" style={{ color: "#666666" }}>
          No game passes or badges found for this player.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "#191919", border: "1px solid #2a2a2a" }}
            >
              <p className="text-sm" style={{ color: "#d1d5db" }}>{item.name ?? item.id}</p>
              <ItemTypeBadge type={item.type} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
