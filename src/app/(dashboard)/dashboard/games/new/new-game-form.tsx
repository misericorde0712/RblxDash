"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { ModuleId } from "@/types"

type MyRobloxGame = {
  universeId: string
  placeId: string
  name: string
  placeVisits: number
  source?: string
}

const ALL_MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: "players", label: "Players", description: "Track player joins and activity" },
  { id: "moderation", label: "Moderation", description: "Bans, kicks, and timeouts" },
  { id: "logs", label: "Logs", description: "Game event log feed" },
  { id: "analytics", label: "Analytics", description: "Daily stats and charts" },
  { id: "economy", label: "Economy", description: "Revenue and spend tracking" },
]

export default function NewGameForm({
  allowedModules,
  canSubmit,
  blockingMessage,
  robloxConnection,
}: {
  allowedModules: ModuleId[]
  canSubmit: boolean
  blockingMessage?: string | null
  robloxConnection?: {
    robloxUserId: string
    robloxUsername: string | null
    robloxDisplayName: string | null
    scopes: string[]
  } | null
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [robloxPlaceId, setRobloxPlaceId] = useState("")
  const [robloxUniverseId, setRobloxUniverseId] = useState("")
  const [openCloudApiKey, setOpenCloudApiKey] = useState("")
  const [modules, setModules] = useState<ModuleId[]>(["players", "logs"])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [myGames, setMyGames] = useState<MyRobloxGame[]>([])
  const [myGamesLoading, setMyGamesLoading] = useState(false)
  const [selectedMyGame, setSelectedMyGame] = useState<string | null>(null)

  const requiresOpenCloudKey = !robloxConnection

  useEffect(() => {
    if (!robloxConnection) return
    setMyGamesLoading(true)
    fetch("/api/roblox/my-games")
      .then((r) => r.ok ? r.json() : { games: [] })
      .then((data: { games?: MyRobloxGame[] }) => setMyGames(data.games ?? []))
      .catch(() => setMyGames([]))
      .finally(() => setMyGamesLoading(false))
  }, [robloxConnection])

  useEffect(() => {
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current)
    const trimmed = robloxPlaceId.trim()
    if (!trimmed || !/^\d{6,}$/.test(trimmed)) return

    lookupTimeout.current = setTimeout(async () => {
      setLookupLoading(true)
      try {
        const res = await fetch(`/api/roblox/universe/lookup?placeId=${encodeURIComponent(trimmed)}`)
        if (!res.ok) return
        const data = (await res.json()) as { universeId?: string; name?: string | null }
        if (data.universeId && !robloxUniverseId) setRobloxUniverseId(data.universeId)
        if (data.name && !name.trim()) setName(data.name)
      } catch {
        // silently ignore
      } finally {
        setLookupLoading(false)
      }
    }, 600)

    return () => { if (lookupTimeout.current) clearTimeout(lookupTimeout.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robloxPlaceId])

  function selectMyGame(game: MyRobloxGame) {
    setSelectedMyGame(game.universeId)
    setRobloxPlaceId(game.placeId)
    setRobloxUniverseId(game.universeId)
    setName(game.name)
  }

  function toggleModule(id: ModuleId) {
    if (!allowedModules.includes(id)) return
    setModules((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canSubmit) {
      setError(blockingMessage ?? "You cannot create a game right now.")
      return
    }
    if (!name.trim() || (!robloxPlaceId.trim() && !robloxUniverseId.trim())) {
      setError("Game name and either Place ID or Universe ID are required.")
      return
    }
    if (!robloxConnection && !openCloudApiKey.trim()) {
      setError("An Open Cloud API key is required when no Roblox account is linked.")
      return
    }
    if (modules.length === 0) {
      setError("Select at least one module.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, robloxPlaceId, robloxUniverseId, openCloudApiKey, modules }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to create game.")
        return
      }
      router.push(`/dashboard/games/${data.game.id}?setup=1`)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-px rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2a2a" }}>

      {/* Roblox game picker — only when connected */}
      {robloxConnection && (
        <div className="p-5" style={{ background: "#1e1e1e" }}>
          <p className="mb-3 text-sm font-medium text-white">
            Pick a game
            <span className="ml-2 text-xs font-normal" style={{ color: "#6b7280" }}>
              from your Roblox account
            </span>
          </p>
          {myGamesLoading ? (
            <p className="text-sm" style={{ color: "#6b7280" }}>Loading…</p>
          ) : myGames.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto pr-0.5">
              {myGames.map((g) => {
                const isSelected = selectedMyGame === g.universeId
                return (
                  <button
                    key={g.placeId}
                    type="button"
                    disabled={loading}
                    onClick={() => selectMyGame(g)}
                    className="text-left rounded-xl border px-3 py-2.5 transition disabled:opacity-50"
                    style={
                      isSelected
                        ? { borderColor: "#e8822a", background: "rgba(232,130,42,0.08)" }
                        : { borderColor: "#333", background: "#252525" }
                    }
                  >
                    <p className="text-sm font-medium text-white truncate">{g.name}</p>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: "#6b7280" }}>
                      {g.placeId || g.universeId}
                      {g.source && g.source !== "user" && (
                        <span className="ml-1.5 font-sans" style={{ color: "#555" }}>· {g.source}</span>
                      )}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "#6b7280" }}>
              No public games found on your account or groups. You can enter a Place ID manually below.
            </p>
          )}
        </div>
      )}

      {/* Divider with label when picker is shown */}
      {robloxConnection && (
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#1a1a1a", borderTop: "1px solid #2a2a2a", borderBottom: "1px solid #2a2a2a" }}>
          <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
          <span className="text-xs" style={{ color: "#555" }}>or fill in manually</span>
          <div className="flex-1 h-px" style={{ background: "#2a2a2a" }} />
        </div>
      )}

      {/* Main fields */}
      <div className="p-5 space-y-4" style={{ background: "#1e1e1e" }}>
        {/* Game name + Place ID */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
              Game name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Food Truck Game"
              disabled={loading}
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
              style={{ background: "#252525", borderColor: "#333" }}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
              Place ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={robloxPlaceId}
                onChange={(e) => setRobloxPlaceId(e.target.value)}
                placeholder="123456789"
                disabled={loading}
                className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
                style={{ background: "#252525", borderColor: "#333" }}
              />
              {lookupLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#e8822a" }}>
                  Looking up…
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Universe ID */}
        <div>
          <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
            Universe ID
            <span className="ml-2 text-xs font-normal" style={{ color: "#555" }}>Optional — auto-filled when Place ID is entered</span>
          </label>
          <input
            type="text"
            value={robloxUniverseId}
            onChange={(e) => setRobloxUniverseId(e.target.value)}
            placeholder="Auto-filled from Place ID"
            disabled={loading}
            className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
            style={{ background: "#252525", borderColor: "#333" }}
          />
        </div>

        {/* Open Cloud key — only required when no Roblox account linked */}
        {requiresOpenCloudKey ? (
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
              Open Cloud API Key
            </label>
            <input
              type="password"
              required
              value={openCloudApiKey}
              onChange={(e) => setOpenCloudApiKey(e.target.value)}
              placeholder="Roblox Open Cloud key"
              disabled={loading}
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
              style={{ background: "#252525", borderColor: "#333" }}
            />
            <p className="mt-1.5 text-xs" style={{ color: "#6b7280" }}>
              Required — no Roblox account linked.{" "}
              <a href="/account" className="underline" style={{ color: "#9ca3af" }}>Link one in Account</a> to skip this.
            </p>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
              Open Cloud API Key
              <span className="ml-2 text-xs font-normal" style={{ color: "#555" }}>Optional</span>
            </label>
            <input
              type="password"
              value={openCloudApiKey}
              onChange={(e) => setOpenCloudApiKey(e.target.value)}
              placeholder="Leave empty to use linked Roblox account"
              disabled={loading}
              className="w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors disabled:opacity-60"
              style={{ background: "#252525", borderColor: "#333" }}
            />
          </div>
        )}
      </div>

      {/* Modules */}
      <div className="p-5" style={{ background: "#1e1e1e", borderTop: "1px solid #2a2a2a" }}>
        <p className="mb-3 text-sm font-medium text-white">Modules</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_MODULES.map((mod) => {
            const isAllowed = allowedModules.includes(mod.id)
            const isChecked = modules.includes(mod.id)
            return (
              <label
                key={mod.id}
                className="flex items-center gap-3 rounded-xl border px-3 py-2.5 transition"
                style={
                  isAllowed
                    ? { cursor: "pointer", borderColor: isChecked ? "#e8822a" : "#333", background: isChecked ? "rgba(232,130,42,0.06)" : "#252525" }
                    : { cursor: "not-allowed", borderColor: "#2a2a2a", background: "#1a1a1a", opacity: 0.5 }
                }
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleModule(mod.id)}
                  disabled={!isAllowed || loading}
                  className="shrink-0"
                  style={{ accentColor: "#e8822a" }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{mod.label}</p>
                  <p className="text-xs truncate" style={{ color: "#6b7280" }}>
                    {isAllowed ? mod.description : "Requires a higher plan"}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4" style={{ background: "#1a1a1a", borderTop: "1px solid #2a2a2a" }}>
        {error && (
          <p
            className="mb-4 rounded-xl px-3 py-2.5 text-sm"
            style={{ border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.06)", color: "#fca5a5" }}
          >
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border px-4 py-2 text-sm font-medium transition"
            style={{ borderColor: "#333", color: "#9ca3af" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded-xl px-5 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "#e8822a" }}
          >
            {loading ? "Creating…" : "Create game"}
          </button>
        </div>
      </div>
    </form>
  )
}
