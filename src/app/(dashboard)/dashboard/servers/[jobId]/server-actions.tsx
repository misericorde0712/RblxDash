"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"

export default function ServerActions({
  gameId,
  jobId,
}: {
  gameId: string
  jobId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<"shutdown" | "broadcast" | null>(null)
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false)
  const [broadcastMessage, setBroadcastMessage] = useState("")
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function sendCommand(body: Record<string, unknown>, busyKey: "shutdown" | "broadcast") {
    setBusy(busyKey)
    setResult(null)

    try {
      const res = await fetch(`/api/games/${gameId}/servers/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ type: "error", text: data.error ?? "Command failed" })
        return
      }

      setResult({ type: "success", text: `${busyKey === "shutdown" ? "Shutdown" : "Broadcast"} command sent` })
      setShowShutdownConfirm(false)
      setBroadcastMessage("")
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setResult({ type: "error", text: "Command failed" })
    } finally {
      setBusy(null)
    }
  }

  function handleShutdown() {
    sendCommand({ command: "shutdown", jobId }, "shutdown")
  }

  function handleBroadcast(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!broadcastMessage.trim()) return
    sendCommand({ command: "broadcast", jobId, message: broadcastMessage.trim() }, "broadcast")
  }

  return (
    <div className="space-y-4">
      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            result.type === "success"
              ? "border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
              : "border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]"
          }`}
        >
          {result.text}
        </div>
      )}

      {/* Broadcast to this server */}
      <div className="rd-card p-5">
        <h2 className="text-sm font-semibold text-white">Broadcast to this server</h2>
        <p className="mt-1 text-xs text-[#666666]">Send a message to players on this server only</p>
        <form onSubmit={handleBroadcast} className="mt-3 flex gap-2">
          <input
            type="text"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Message..."
            required
            maxLength={500}
            disabled={busy !== null}
            className="rd-input flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={busy !== null || !broadcastMessage.trim()}
            className="rd-button-primary px-3 py-2 text-xs disabled:opacity-50"
          >
            {busy === "broadcast" ? "..." : "Send"}
          </button>
        </form>
      </div>

      {/* Shutdown */}
      <div className="rd-card p-5">
        <h2 className="text-sm font-semibold text-white">Shutdown server</h2>
        <p className="mt-1 text-xs text-[#666666]">
          Kicks all players and closes this server instance
        </p>
        {showShutdownConfirm ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleShutdown}
              disabled={busy !== null}
              className="rounded-lg border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.12)] px-4 py-2 text-sm font-semibold text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.2)] disabled:opacity-50"
            >
              {busy === "shutdown" ? "Shutting down..." : "Confirm shutdown"}
            </button>
            <button
              onClick={() => setShowShutdownConfirm(false)}
              disabled={busy !== null}
              className="text-sm text-[#666666] transition hover:text-[#9ca3af]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowShutdownConfirm(true)}
            className="mt-3 rounded-lg border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-4 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.15)]"
          >
            Shutdown this server
          </button>
        )}
      </div>
    </div>
  )
}
