"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export default function DeleteGameButton({
  gameId,
  gameName,
}: {
  gameId: string
  gameName: string
}) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const canConfirm = confirmText === gameName

  function handleOpen() {
    setConfirmText("")
    setError(null)
    setOpen(true)
  }

  function handleClose() {
    if (isPending) return
    setOpen(false)
    setConfirmText("")
    setError(null)
  }

  function handleDelete() {
    if (!canConfirm) return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${gameId}`, { method: "DELETE" })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError((data as { error?: string }).error ?? "Failed to delete game.")
          return
        }
        router.push("/dashboard/games")
      } catch {
        setError("Network error. Please try again.")
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
        style={{
          borderColor: "rgba(248,113,113,0.3)",
          background: "rgba(248,113,113,0.06)",
          color: "#fca5a5",
        }}
      >
        Delete game
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#1e1e1e", border: "1px solid #333" }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "rgba(248,113,113,0.1)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-white">Delete game</p>
                <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
                  This will permanently delete{" "}
                  <span className="font-medium text-white">{gameName}</span>{" "}
                  and all associated data — servers, players, sanctions, logs, config, and events.
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Confirm input */}
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "#9ca3af" }}>
                Type <span className="font-semibold text-white">{gameName}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                placeholder={gameName}
                disabled={isPending}
                autoComplete="off"
                className="w-full rounded-xl border px-3 py-2.5 text-sm text-white outline-none transition-colors disabled:opacity-50"
                style={{
                  background: "#252525",
                  borderColor: confirmText === gameName ? "rgba(248,113,113,0.5)" : "#333",
                }}
              />
            </div>

            {error && (
              <p
                className="mb-4 rounded-xl px-3 py-2 text-sm"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }}
              >
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ borderColor: "#333", background: "#252525", color: "#9ca3af" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canConfirm || isPending}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: "#dc2626", color: "#fff" }}
              >
                {isPending ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
