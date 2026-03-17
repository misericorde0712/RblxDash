"use client"

import { useState, useCallback } from "react"

type EventEntry = {
  id: string
  name: string
  slug: string
  description: string | null
  eventData: string
  startsAt: Date | string
  endsAt: Date | string | null
  active: boolean
  createdAt: Date | string
  updatedAt: Date | string
  updatedBy: string | null
}

type NewEvent = {
  name: string
  slug: string
  description: string
  eventData: string
  startsAt: string
  endsAt: string
  active: boolean
}

const EMPTY_NEW: NewEvent = {
  name: "",
  slug: "",
  description: "",
  eventData: "{}",
  startsAt: "",
  endsAt: "",
  active: true,
}

function toLocalDatetime(d: Date | string | null): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function formatDate(d: Date | string | null): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getEventStatus(event: EventEntry): { label: string; color: string; bg: string } {
  const now = new Date()
  const start = new Date(event.startsAt)
  const end = event.endsAt ? new Date(event.endsAt) : null

  if (!event.active) {
    return { label: "Disabled", color: "#666666", bg: "rgba(102,102,102,0.1)" }
  }
  if (start > now) {
    return { label: "Scheduled", color: "#7dd3fc", bg: "rgba(125,211,252,0.1)" }
  }
  if (end && end < now) {
    return { label: "Ended", color: "#888888", bg: "rgba(136,136,136,0.1)" }
  }
  return { label: "Active", color: "#4ade80", bg: "rgba(74,222,128,0.1)" }
}

export default function LiveEventsManager({
  gameId,
  initialEvents,
  initialVersion,
  isAdmin,
}: {
  gameId: string
  initialEvents: EventEntry[]
  initialVersion: number
  isAdmin: boolean
}) {
  const [events, setEvents] = useState<EventEntry[]>(initialEvents)
  const [version, setVersion] = useState(initialVersion)
  const [showCreate, setShowCreate] = useState(false)
  const [newEvent, setNewEvent] = useState<NewEvent>({ ...EMPTY_NEW })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<NewEvent>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = `/api/games/${gameId}/events`

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(apiUrl)
      const json = await res.json()
      if (json.data) {
        setEvents(json.data)
        setVersion(json.version ?? version)
      }
    } catch {}
  }, [apiUrl, version])

  function autoSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
  }

  async function handleCreate() {
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name: newEvent.name,
        slug: newEvent.slug,
        description: newEvent.description || undefined,
        eventData: newEvent.eventData,
        startsAt: new Date(newEvent.startsAt).toISOString(),
        active: newEvent.active,
      }
      if (newEvent.endsAt) {
        body.endsAt = new Date(newEvent.endsAt).toISOString()
      }

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to create")
        return
      }
      setNewEvent({ ...EMPTY_NEW })
      setShowCreate(false)
      await refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(id: string) {
    setError(null)
    setLoading(true)
    try {
      const body: Record<string, unknown> = { id }
      if (editData.name !== undefined) body.name = editData.name
      if (editData.slug !== undefined) body.slug = editData.slug
      if (editData.description !== undefined) body.description = editData.description
      if (editData.eventData !== undefined) body.eventData = editData.eventData
      if (editData.startsAt !== undefined) body.startsAt = new Date(editData.startsAt).toISOString()
      if (editData.endsAt !== undefined) body.endsAt = editData.endsAt ? new Date(editData.endsAt).toISOString() : null
      if (editData.active !== undefined) body.active = editData.active

      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to update")
        return
      }
      setEditingId(null)
      setEditData({})
      await refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleActive(event: EventEntry) {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(apiUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: event.id, active: !event.active }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Failed to toggle")
        return
      }
      await refresh()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(event: EventEntry) {
    if (!confirm(`Delete event "${event.name}"? This takes effect immediately in-game.`)) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${apiUrl}?id=${encodeURIComponent(event.id)}`, {
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
        Live Events lets you schedule and control in-game events from this dashboard.
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
            {showCreate ? "Cancel" : "+ Add event"}
          </button>
          <span className="text-xs" style={{ color: "#666666" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: "#222222", border: "1px solid #2a2a2a" }}
        >
          <p className="text-sm font-semibold text-white">New event</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Name
              </label>
              <input
                type="text"
                placeholder="Halloween 2026"
                value={newEvent.name}
                onChange={(e) => {
                  const name = e.target.value
                  setNewEvent((prev) => ({
                    ...prev,
                    name,
                    slug: prev.slug === autoSlug(prev.name) || !prev.slug ? autoSlug(name) : prev.slug,
                  }))
                }}
                className="rd-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Slug (unique identifier)
              </label>
              <input
                type="text"
                placeholder="halloween-2026"
                value={newEvent.slug}
                onChange={(e) => setNewEvent({ ...newEvent, slug: e.target.value })}
                className="rd-input w-full font-mono text-sm"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Starts at
              </label>
              <input
                type="datetime-local"
                value={newEvent.startsAt}
                onChange={(e) => setNewEvent({ ...newEvent, startsAt: e.target.value })}
                className="rd-input w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
                Ends at (optional)
              </label>
              <input
                type="datetime-local"
                value={newEvent.endsAt}
                onChange={(e) => setNewEvent({ ...newEvent, endsAt: e.target.value })}
                className="rd-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
              Description (optional)
            </label>
            <input
              type="text"
              placeholder="Annual halloween event with special rewards"
              value={newEvent.description}
              onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
              className="rd-input w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>
              Event data (JSON — accessible in-game)
            </label>
            <textarea
              placeholder={'{\n  "multiplier": 2,\n  "theme": "spooky",\n  "rewards": ["hat", "sword"]\n}'}
              value={newEvent.eventData}
              onChange={(e) => setNewEvent({ ...newEvent, eventData: e.target.value })}
              className="rd-input w-full font-mono text-xs"
              rows={4}
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={loading || !newEvent.name || !newEvent.slug || !newEvent.startsAt}
            className="rd-button-primary text-sm disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create event"}
          </button>
        </div>
      )}

      {/* Event list */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-16 text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(232,130,42,0.1)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white">No events yet</h2>
          <p className="mt-2 max-w-sm mx-auto text-sm" style={{ color: "#666666" }}>
            Create your first event to start controlling in-game events from this dashboard.
          </p>
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-xl"
          style={{ background: "#222222", border: "1px solid #2a2a2a" }}
        >
          {events.map((event, i) => {
            const status = getEventStatus(event)
            const isEditing = editingId === event.id

            if (isEditing) {
              return (
                <div
                  key={event.id}
                  className="p-5 space-y-4"
                  style={{
                    borderBottom: i < events.length - 1 ? "1px solid #242424" : "none",
                  }}
                >
                  <p className="text-sm font-semibold text-white">Edit event</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>Name</label>
                      <input
                        type="text"
                        value={editData.name ?? event.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="rd-input w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>Slug</label>
                      <input
                        type="text"
                        value={editData.slug ?? event.slug}
                        onChange={(e) => setEditData({ ...editData, slug: e.target.value })}
                        className="rd-input w-full font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>Starts at</label>
                      <input
                        type="datetime-local"
                        value={editData.startsAt ?? toLocalDatetime(event.startsAt)}
                        onChange={(e) => setEditData({ ...editData, startsAt: e.target.value })}
                        className="rd-input w-full"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>Ends at</label>
                      <input
                        type="datetime-local"
                        value={editData.endsAt ?? toLocalDatetime(event.endsAt)}
                        onChange={(e) => setEditData({ ...editData, endsAt: e.target.value })}
                        className="rd-input w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>Description</label>
                    <input
                      type="text"
                      value={editData.description ?? event.description ?? ""}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="rd-input w-full"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: "#888888" }}>Event data (JSON)</label>
                    <textarea
                      value={editData.eventData ?? event.eventData}
                      onChange={(e) => setEditData({ ...editData, eventData: e.target.value })}
                      className="rd-input w-full font-mono text-xs"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdate(event.id)}
                      disabled={loading}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                      style={{ background: "#e8822a" }}
                    >
                      {loading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditData({}) }}
                      className="text-xs"
                      style={{ color: "#666666" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={event.id}
                className="flex flex-wrap items-center gap-3 px-5 py-4"
                style={{
                  borderBottom: i < events.length - 1 ? "1px solid #242424" : "none",
                }}
              >
                {/* Event info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{event.name}</span>
                    <code className="text-xs font-mono" style={{ color: "#888888" }}>{event.slug}</code>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase"
                      style={{ background: status.bg, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  {event.description && (
                    <p className="mt-0.5 text-xs" style={{ color: "#666666" }}>
                      {event.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs" style={{ color: "#555555" }}>
                    {formatDate(event.startsAt)}
                    {event.endsAt ? ` → ${formatDate(event.endsAt)}` : " → No end date"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {event.eventData !== "{}" && (
                    <code
                      className="max-w-[160px] truncate rounded px-2 py-1 text-xs font-mono"
                      style={{ background: "#1a1a1a", color: "#c084fc" }}
                      title={event.eventData}
                    >
                      {event.eventData.length > 25
                        ? event.eventData.slice(0, 25) + "..."
                        : event.eventData}
                    </code>
                  )}
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleToggleActive(event)}
                        disabled={loading}
                        className="rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                        style={{ color: event.active ? "#4ade80" : "#666666" }}
                      >
                        {event.active ? "On" : "Off"}
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(event.id)
                          setEditData({})
                        }}
                        className="rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:text-white"
                        style={{ color: "#888888" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
                        className="rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:text-[#f87171]"
                        style={{ color: "#666666" }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Luau usage guide */}
      {events.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
        >
          <p className="text-sm font-semibold text-white mb-3">Luau usage</p>
          <p className="text-xs mb-3" style={{ color: "#888888" }}>
            Require the Live Events add-on module from any server script:
          </p>
          <pre
            className="overflow-x-auto rounded-lg p-4 text-xs font-mono"
            style={{ background: "#111111", color: "#d1d5db" }}
          >
{`local ServerScriptService = game:GetService("ServerScriptService")
local LiveEvents = require(ServerScriptService:WaitForChild("RblxDashLiveEvents"))

-- Get all currently active events
local events = LiveEvents.getActive()

-- Check if a specific event is active (by slug)
local halloween = LiveEvents.get("halloween-2026")
if halloween then
    print("Event:", halloween.name)
    print("Data:", halloween.data) -- custom JSON data as a table
end

-- Check if an event is active (returns true/false)
if LiveEvents.isActive("double-xp") then
    -- Apply double XP logic
end

-- Listen for event changes (fires every time the poll detects updates)
LiveEvents.onChanged:Connect(function(activeEvents, previousEvents)
    print("Events updated to v" .. tostring(LiveEvents.getVersion()))
    for _, event in ipairs(activeEvents) do
        print("  Active:", event.slug, event.name)
    end
end)

-- Force an immediate refresh
LiveEvents.refresh()`}
          </pre>
        </div>
      )}
    </div>
  )
}
