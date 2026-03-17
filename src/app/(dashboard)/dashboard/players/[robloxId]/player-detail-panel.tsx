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
  if (!reason || reason.trim() === "") {
    return "No reason provided"
  }

  return reason
}

function getSanctionStatus(sanction: PlayerSanctionItem) {
  if (sanction.type === "UNBAN") {
    return "Lifted"
  }

  return isSanctionCurrentlyActive({
    active: sanction.active,
    expiresAt: sanction.expiresAt ? new Date(sanction.expiresAt) : null,
  })
    ? "Active"
    : "Inactive"
}

function getSanctionStatusClassName(status: string) {
  if (status === "Active") {
    return "border-red-900 bg-red-950/60 text-red-200"
  }

  if (status === "Lifted") {
    return "border-green-900 bg-green-950/60 text-green-200"
  }

  return "border-gray-700 bg-gray-950 text-gray-300"
}

function getActionButtonLabel(type: SanctionType) {
  switch (type) {
    case "KICK":
      return "Send kick"
    case "TIMEOUT":
      return "Create timeout"
    case "BAN":
      return "Create ban"
    case "UNBAN":
      return "Lift restriction"
  }
}

function getDeliveryStatusClassName(status: SanctionDeliveryStatus) {
  if (status === "APPLIED") {
    return "border-green-900 bg-green-950/60 text-green-200"
  }

  if (status === "FAILED") {
    return "border-red-900 bg-red-950/60 text-red-200"
  }

  return "border-yellow-900 bg-yellow-950/60 text-yellow-200"
}

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: noteContent,
        }),
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
      startTransition(() => {
        router.refresh()
      })
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
        headers: {
          "Content-Type": "application/json",
        },
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
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setError("Unable to update moderation")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-green-900 bg-green-950/60 px-4 py-3 text-sm text-green-300">
          {notice}
        </div>
      ) : null}

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">Moderation</h2>
            <p className="mt-1 text-sm text-gray-400">
              Kicks, timeouts, bans, and unbans sync back to the Roblox game.
            </p>
          </div>
          <div className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-xs text-gray-300">
            {activeRestrictions.length} active
          </div>
        </div>

        <form onSubmit={handleCreateSanction} className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Action
              </label>
              <select
                value={sanctionType}
                onChange={(event) => setSanctionType(event.target.value as SanctionType)}
                disabled={busyKey !== null}
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                {SANCTION_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {formatSanctionType(type)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
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
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {sanctionType === "TIMEOUT" || sanctionType === "BAN" ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
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
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busyKey !== null}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyKey === "sanction"
              ? "Saving..."
              : getActionButtonLabel(sanctionType)}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white">Notes</h2>
        <form onSubmit={handleCreateNote} className="mt-4 space-y-4">
          <textarea
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            required
            rows={4}
            disabled={busyKey !== null}
            placeholder="Internal note visible to your team only"
            className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={busyKey !== null}
            className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-200 transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyKey === "note" ? "Saving..." : "Add note"}
          </button>
        </form>

        <div className="mt-5 space-y-3">
          {noteItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              No internal notes for this player yet.
            </p>
          ) : (
            noteItems.map((note) => (
              <div
                key={note.id}
                className="rounded-xl border border-gray-800 bg-gray-950/70 p-4"
              >
                <p className="whitespace-pre-wrap text-sm text-gray-200">
                  {note.content}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  {note.authorLabel} · {formatDateTime(note.createdAt)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
        <h2 className="text-base font-semibold text-white">Sanction history</h2>
        <div className="mt-4 space-y-3">
          {sanctionItems.length === 0 ? (
            <p className="text-sm text-gray-500">
              No moderation actions recorded for this player yet.
            </p>
          ) : (
            sanctionItems.map((sanction) => {
              const status = getSanctionStatus(sanction)

              return (
                <div
                  key={sanction.id}
                  className="rounded-xl border border-gray-800 bg-gray-950/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-gray-700 px-2.5 py-1 text-xs text-gray-200">
                      {formatSanctionType(sanction.type)}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${getSanctionStatusClassName(
                        status
                      )}`}
                    >
                      {status}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs ${getDeliveryStatusClassName(
                        sanction.deliveryStatus
                      )}`}
                    >
                      {formatSanctionDeliveryStatus(sanction.deliveryStatus)}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-200">
                    {formatReason(sanction.reason)}
                  </p>

                  <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
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
                    <p className="mt-3 text-xs text-red-300">
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
