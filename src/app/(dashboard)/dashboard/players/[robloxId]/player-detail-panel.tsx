"use client"

import { startTransition, useState } from "react"
import type { SanctionDeliveryStatus, SanctionType } from "@prisma/client"
import { useRouter } from "next/navigation"
import {
  formatSanctionDeliveryStatus,
  formatSanctionType,
  formatSanctionWindow,
  isSanctionCurrentlyActive,
} from "@/lib/player-moderation"

const SANCTION_OPTIONS = ["KICK", "TIMEOUT", "BAN", "UNBAN"] as const satisfies SanctionType[]

type PlayerNoteItem = {
  id: string
  content: string
  createdAt: string
  authorLabel: string
}

type PlayerSanctionItem = {
  id: string
  type: SanctionType
  reason: string
  active: boolean
  createdAt: string
  updatedAt: string
  expiresAt: string | null
  moderator: string
  deliveryStatus: SanctionDeliveryStatus
  deliveredAt: string | null
  deliveryDetails: string | null
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatReason(reason: string | null) {
  if (!reason || reason.trim() === "") return "No reason provided"
  return reason
}

function getSanctionStatus(sanction: PlayerSanctionItem) {
  if (sanction.type === "UNBAN") return "Lifted"
  return isSanctionCurrentlyActive({
    active: sanction.active,
    expiresAt: sanction.expiresAt ? new Date(sanction.expiresAt) : null,
  })
    ? "Active"
    : "Inactive"
}

function getSanctionStatusStyle(status: string): { background: string; border: string; color: string } {
  if (status === "Active") {
    return { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }
  }
  if (status === "Lifted") {
    return { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#86efac" }
  }
  return { background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.15)", color: "#9ca3af" }
}

function getActionButtonLabel(type: SanctionType) {
  switch (type) {
    case "KICK": return "Send kick"
    case "TIMEOUT": return "Create timeout"
    case "BAN": return "Create ban"
    case "UNBAN": return "Lift restriction"
  }
}

function getDeliveryStatusStyle(status: SanctionDeliveryStatus): { background: string; border: string; color: string } {
  if (status === "APPLIED") {
    return { background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#86efac" }
  }
  if (status === "FAILED") {
    return { background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }
  }
  return { background: "rgba(250,204,21,0.08)", border: "1px solid rgba(250,204,21,0.2)", color: "#fde68a" }
}

const inputClass =
  "w-full rounded-xl border px-3 py-2.5 text-sm text-white placeholder-[#555] outline-none transition-colors"
const inputStyle = { background: "#252525", borderColor: "#333" }
const focusStyle = { background: "#252525", borderColor: "#e8822a" }

export default function PlayerDetailPanel({
  robloxId,
  notes,
  sanctions,
}: {
  robloxId: string
  notes: PlayerNoteItem[]
  sanctions: PlayerSanctionItem[]
}) {
  const router = useRouter()
  const [noteItems, setNoteItems] = useState(notes)
  const [sanctionItems, setSanctionItems] = useState(sanctions)
  const [noteContent, setNoteContent] = useState("")
  const [sanctionType, setSanctionType] = useState<SanctionType>("KICK")
  const [sanctionReason, setSanctionReason] = useState("")
  const [durationMinutes, setDurationMinutes] = useState("30")
  const [busyKey, setBusyKey] = useState<"note" | "sanction" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const activeRestrictions = sanctionItems.filter(
    (sanction) =>
      sanction.type !== "UNBAN" &&
      isSanctionCurrentlyActive({
        active: sanction.active,
        expiresAt: sanction.expiresAt ? new Date(sanction.expiresAt) : null,
      })
  )

  async function handleCreateNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyKey("note")
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/players/${robloxId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to add note")
        return
      }

      setNoteItems((currentItems) => [
        {
          id: data.note.id,
          content: data.note.content,
          createdAt: data.note.createdAt,
          authorLabel: data.note.authorLabel,
        },
        ...currentItems,
      ])
      setNoteContent("")
      setNotice("Note added")
      startTransition(() => { router.refresh() })
    } catch {
      setError("Unable to add note")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleCreateSanction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyKey("sanction")
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/players/${robloxId}/sanctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: sanctionType,
          reason: sanctionReason,
          durationMinutes:
            sanctionType === "TIMEOUT" || sanctionType === "BAN"
              ? Number(durationMinutes || 0) || null
              : null,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to update moderation")
        return
      }

      const nextSanction = {
        id: data.sanction.id,
        type: data.sanction.type,
        reason: data.sanction.reason,
        active: data.sanction.active,
        createdAt: data.sanction.createdAt,
        updatedAt: data.sanction.updatedAt,
        expiresAt: data.sanction.expiresAt,
        moderator: data.sanction.moderator,
        deliveryStatus: data.sanction.deliveryStatus,
        deliveredAt: data.sanction.deliveredAt,
        deliveryDetails: data.sanction.deliveryDetails,
      } satisfies PlayerSanctionItem

      setSanctionItems((currentItems) => {
        const updatedItems =
          sanctionType === "UNBAN"
            ? currentItems.map((item) =>
                item.type === "BAN" || item.type === "TIMEOUT"
                  ? { ...item, active: false }
                  : item
              )
            : sanctionType === "BAN" || sanctionType === "TIMEOUT"
              ? currentItems.map((item) =>
                  item.type === "BAN" || item.type === "TIMEOUT"
                    ? { ...item, active: false }
                    : item
                )
              : currentItems

        return [nextSanction, ...updatedItems]
      })

      setSanctionReason("")
      if (sanctionType === "TIMEOUT") {
        setDurationMinutes("30")
      }
      setNotice(`${formatSanctionType(sanctionType)} saved`)
      startTransition(() => { router.refresh() })
    } catch {
      setError("Unable to update moderation")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)", color: "#fca5a5" }}
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)", color: "#86efac" }}
        >
          {notice}
        </div>
      ) : null}

      {/* Moderation */}
      <section className="rd-card p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Moderation</h2>
            <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
              Kicks, timeouts, bans, and unbans sync back to the Roblox game.
            </p>
          </div>
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: "#191919", border: "1px solid #2a2a2a", color: "#9ca3af" }}
          >
            {activeRestrictions.length} active
          </div>
        </div>

        <form onSubmit={handleCreateSanction} className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
                Action
              </label>
              <select
                value={sanctionType}
                onChange={(event) => setSanctionType(event.target.value as SanctionType)}
                disabled={busyKey !== null}
                className={inputClass}
                style={inputStyle}
              >
                {SANCTION_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatSanctionType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
                Reason
              </label>
              <input
                type="text"
                value={sanctionReason}
                onChange={(event) => setSanctionReason(event.target.value)}
                required
                disabled={busyKey !== null}
                minLength={5}
                placeholder="Explain clearly why this action is being applied"
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputStyle)}
              />
            </div>
          </div>

          {sanctionType === "TIMEOUT" || sanctionType === "BAN" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "#d1d5db" }}>
                {sanctionType === "TIMEOUT"
                  ? "Timeout duration in minutes"
                  : "Ban duration in minutes (leave empty for permanent)"}
              </label>
              <input
                type="number"
                min={1}
                step={1}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                required={sanctionType === "TIMEOUT"}
                disabled={busyKey !== null}
                placeholder={sanctionType === "BAN" ? "Permanent" : "30"}
                className={inputClass}
                style={inputStyle}
                onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                onBlur={(e) => Object.assign(e.target.style, inputStyle)}
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busyKey !== null}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "#e8822a" }}
          >
            {busyKey === "sanction"
              ? "Saving..."
              : getActionButtonLabel(sanctionType)}
          </button>
        </form>
      </section>

      {/* Notes */}
      <section className="rd-card p-5">
        <h2 className="text-base font-semibold text-white">Notes</h2>
        <form onSubmit={handleCreateNote} className="mt-4 space-y-4">
          <textarea
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            required
            rows={4}
            disabled={busyKey !== null}
            placeholder="Internal note visible to your team only"
            className={inputClass}
            style={inputStyle}
            onFocus={(e) => Object.assign(e.target.style, focusStyle)}
            onBlur={(e) => Object.assign(e.target.style, inputStyle)}
          />
          <button
            type="submit"
            disabled={busyKey !== null}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ border: "1px solid #2a2a2a", color: "#d1d5db" }}
          >
            {busyKey === "note" ? "Saving..." : "Add note"}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {noteItems.length === 0 ? (
            <p className="text-sm" style={{ color: "#666666" }}>
              No internal notes for this player yet.
            </p>
          ) : (
            noteItems.map((note) => (
              <div
                key={note.id}
                className="rounded-xl p-4"
                style={{ background: "#191919", border: "1px solid #2a2a2a" }}
              >
                <p className="whitespace-pre-wrap text-sm" style={{ color: "#d1d5db" }}>
                  {note.content}
                </p>
                <p className="mt-3 text-xs" style={{ color: "#666666" }}>
                  {note.authorLabel} · {formatDateTime(note.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Sanction history */}
      <section className="rd-card p-5">
        <h2 className="text-base font-semibold text-white">Sanction history</h2>
        <div className="mt-4 space-y-3">
          {sanctionItems.length === 0 ? (
            <p className="text-sm" style={{ color: "#666666" }}>
              No moderation actions recorded for this player yet.
            </p>
          ) : (
            sanctionItems.map((sanction) => {
              const status = getSanctionStatus(sanction)
              const statusStyle = getSanctionStatusStyle(status)
              const deliveryStyle = getDeliveryStatusStyle(sanction.deliveryStatus)

              return (
                <div
                  key={sanction.id}
                  className="rounded-xl p-4"
                  style={{ background: "#191919", border: "1px solid #2a2a2a" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-full px-2.5 py-1 text-xs"
                      style={{ background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.15)", color: "#d1d5db" }}
                    >
                      {formatSanctionType(sanction.type)}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs"
                      style={statusStyle}
                    >
                      {status}
                    </span>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs"
                      style={deliveryStyle}
                    >
                      {formatSanctionDeliveryStatus(sanction.deliveryStatus)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm" style={{ color: "#d1d5db" }}>
                    {formatReason(sanction.reason)}
                  </p>

                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2" style={{ color: "#666666" }}>
                    <p>By {sanction.moderator}</p>
                    <p>Window {formatSanctionWindow({
                      type: sanction.type,
                      createdAt: new Date(sanction.createdAt),
                      expiresAt: sanction.expiresAt ? new Date(sanction.expiresAt) : null,
                    })}</p>
                    <p>Created {formatDateTime(sanction.createdAt)}</p>
                    <p>
                      {sanction.expiresAt
                        ? `Ends ${formatDateTime(sanction.expiresAt)}`
                        : "No expiry"}
                    </p>
                    <p>
                      {sanction.deliveredAt
                        ? `Ack ${formatDateTime(sanction.deliveredAt)}`
                        : "Ack pending"}
                    </p>
                  </div>
                  {sanction.deliveryDetails ? (
                    <p className="mt-3 text-xs" style={{ color: "#f87171" }}>
                      {sanction.deliveryDetails}
                    </p>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
