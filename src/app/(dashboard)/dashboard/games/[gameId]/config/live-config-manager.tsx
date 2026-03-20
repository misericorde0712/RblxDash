"use client"

import { useState, useCallback } from "react"

type ConfigEntry = {
  id: string
  key: string
  value: string
  valueType: string
  group: string
  description: string | null
  createdAt: Date | string
  updatedAt: Date | string
  updatedBy: string | null
}

type NewConfig = {
  key: string
  value: string
  valueType: string
  group: string
  description: string
}

const VALUE_TYPES = [
  { value: "string", label: "String", color: "#7dd3fc" },
  { value: "number", label: "Number", color: "#fbbf24" },
  { value: "boolean", label: "Boolean", color: "#4ade80" },
  { value: "json", label: "JSON", color: "#c084fc" },
]

const EMPTY_NEW: NewConfig = {
  key: "",
  value: "",
  valueType: "string",
  group: "default",
  description: "",
}

export default function LiveConfigManager({
  gameId,
  initialConfigs,
  initialVersion,
  isAdmin,
}: {
  gameId: string
  initialConfigs: ConfigEntry[]
  initialVersion: number
  isAdmin: boolean
}) {
  const [configs, setConfigs] = useState<ConfigEntry[]>(initialConfigs)
  const [version, setVersion] = useState(initialVersion)
  const [showCreate, setShowCreate] = useState(false)
  const [newConfig, setNewConfig] = useState<NewConfig>({ ...EMPTY_NEW })
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = `/api/games/${gameId}/config`

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(apiUrl)
      const json = await res.json()
      if (json.data) {
        setConfigs(json.data)
        setVersion(json.version ?? version)
      }
    } catch {}
  }, [apiUrl, version])

  async function handleCreate() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to create")
        return
      }
      setNewConfig({ ...EMPTY_NEW })
      setShowCreate(false)
      await refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(key: string) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: editValue }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to update")
        return
      }
      setEditingKey(null)
      await refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Delete config "${key}"? This takes effect immediately in-game.`)) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error || "Failed to delete")
        return
      }
      await refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  // Group configs
  const groups = configs.reduce<Record<string, ConfigEntry[]>>((acc, c) => {
    const g = c.group || "default"
    if (!acc[g]) acc[g] = []
    acc[g].push(c)
    return acc
  }, {})

  const groupNames = Object.keys(groups).sort()

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div
        className="rounded-xl px-4 py-3 text-sm"
        style={{
          background: "rgba(232,130,42,0.08)",
          border: "1px solid rgba(232,130,42,0.2)",
          color: "#e8822a",
        }}
      >
        Live Config lets you change game parameters in real-time without republishing.
        Your Roblox game polls these values automatically. Version: <strong>v{version}</strong>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
        >
          {error}
        </div>
      )}

      {/* Create button */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rd-button-primary text-sm"
          >
            {showCreate ? "Cancel" : "+ Add config"}
          </button>
          <span className="text-xs" style={{ color: "#666666" }}>
            {configs.length} config{configs.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "#222222", border: "1px solid #2a2a2a" }}
        >
          <p className="text-sm font-semibold text-white">New config entry</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Key
              </label>
              <input
                type="text"
                placeholder="game.maxPlayers"
                value={newConfig.key}
                onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                className="rd-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Group
              </label>
              <input
                type="text"
                placeholder="default"
                value={newConfig.group}
                onChange={(e) => setNewConfig({ ...newConfig, group: e.target.value })}
                className="rd-input w-full"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Type
              </label>
              <select
                value={newConfig.valueType}
                onChange={(e) => setNewConfig({ ...newConfig, valueType: e.target.value })}
                className="rd-input w-full"
              >
                {VALUE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Value
              </label>
              {newConfig.valueType === "boolean" ? (
                <select
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  className="rd-input w-full"
                >
                  <option value="">Select...</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : newConfig.valueType === "json" ? (
                <textarea
                  placeholder='{"key": "value"}'
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  className="rd-input w-full font-mono text-xs"
                  rows={3}
                />
              ) : (
                <input
                  type={newConfig.valueType === "number" ? "number" : "text"}
                  placeholder={newConfig.valueType === "number" ? "42" : "value"}
                  value={newConfig.value}
                  onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                  className="rd-input w-full"
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="Maximum number of players per server"
              value={newConfig.description}
              onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
              className="rd-input w-full"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !newConfig.key || !newConfig.value}
            className="rd-button-primary text-sm disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create config"}
          </button>
        </div>
      )}

      {/* Config entries grouped */}
      {configs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-16 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(232,130,42,0.1)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
              <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">No configs yet</h2>
          <p className="mt-2 max-w-sm mx-auto text-sm" style={{ color: "#666666" }}>
            Add your first config to control game parameters in real-time from this dashboard.
          </p>
        </div>
      ) : (
        groupNames.map((groupName) => (
          <div key={groupName}>
            <div className="mb-2 flex items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#666666" }}>
                {groupName}
              </p>
              <span className="text-xs" style={{ color: "#444444" }}>
                ({groups[groupName].length})
              </span>
            </div>

            <div
              className="overflow-hidden rounded-xl"
              style={{ background: "#222222", border: "1px solid #2a2a2a" }}
            >
              {groups[groupName].map((config, i) => {
                const typeInfo = VALUE_TYPES.find((t) => t.value === config.valueType)
                const isEditing = editingKey === config.key

                return (
                  <div
                    key={config.id}
                    className="flex flex-wrap items-center gap-3 px-5 py-3.5"
                    style={{
                      borderBottom:
                        i < groups[groupName].length - 1 ? "1px solid #242424" : "none",
                    }}
                  >
                    {/* Key */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium text-white">{config.key}</code>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          style={{
                            background: `${typeInfo?.color ?? "#888"}22`,
                            color: typeInfo?.color ?? "#888",
                          }}
                        >
                          {config.valueType}
                        </span>
                      </div>
                      {config.description && (
                        <p className="mt-0.5 text-xs" style={{ color: "#666666" }}>
                          {config.description}
                        </p>
                      )}
                    </div>

                    {/* Value */}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          {config.valueType === "boolean" ? (
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="rd-input w-32 text-sm"
                            >
                              <option value="true">true</option>
                              <option value="false">false</option>
                            </select>
                          ) : (
                            <input
                              type={config.valueType === "number" ? "number" : "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="rd-input w-40 text-sm font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdate(config.key)
                                if (e.key === "Escape") setEditingKey(null)
                              }}
                            />
                          )}
                          <button
                            onClick={() => handleUpdate(config.key)}
                            disabled={loading}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white"
                            style={{ background: "#e8822a" }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="text-xs"
                            style={{ color: "#666666" }}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <code
                            className="max-w-[200px] truncate rounded px-2 py-1 text-sm font-mono"
                            style={{ background: "#1a1a1a", color: typeInfo?.color ?? "#d1d5db" }}
                            title={config.value}
                          >
                            {config.valueType === "boolean"
                              ? config.value === "true"
                                ? "true"
                                : "false"
                              : config.value.length > 30
                                ? config.value.slice(0, 30) + "..."
                                : config.value}
                          </code>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingKey(config.key)
                                  setEditValue(config.value)
                                }}
                                className="rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:text-white"
                                style={{ color: "#888888" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(config.key)}
                                className="rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:text-[#f87171]"
                                style={{ color: "#666666" }}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Luau usage guide */}
      {configs.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
        >
          <p className="text-sm font-semibold text-white mb-3">How to use in your game</p>
          <p className="text-xs mb-3" style={{ color: "#888888" }}>
            Require the Live Config add-on module from any server script:
          </p>
          <pre
            className="overflow-x-auto rounded-lg p-4 text-xs font-mono"
            style={{ background: "#111111", color: "#d1d5db" }}
          >
{`local ServerScriptService = game:GetService("ServerScriptService")
local LiveConfig = require(ServerScriptService:WaitForChild("RblxDashLiveConfig"))

-- Read a single value (with optional default)
local maxPlayers = LiveConfig.get("game.maxPlayers", 20)

-- Read all configs as a table
local allConfigs = LiveConfig.getAll()

-- React when configs change in real-time
LiveConfig.onChanged:Connect(function(newConfig, oldConfig)
    print("Configs updated to v" .. tostring(LiveConfig.getVersion()))
end)

-- Force an immediate refresh
LiveConfig.refresh()`}
          </pre>
        </div>
      )}
    </div>
  )
}
