"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"

export default function ServerBroadcastForm({
  gameId,
}: {
  gameId: string
}) {
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!message.trim()) return

    setBusy(true)
    setResult(null)

    try {
      const res = await fetch(`/api/games/${gameId}/servers/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "broadcast",
          message: message.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ type: "error", text: data.error ?? "Failed to send broadcast" })
        return
      }

      setResult({ type: "success", text: "Broadcast sent to all servers" })
      setMessage("")
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setResult({ type: "error", text: "Failed to send broadcast" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rd-card mb-6 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Broadcast message</h2>
          <p className="mt-0.5 text-xs text-[#666666]">
            Send a message to all active game servers via MessagingService
          </p>
        </div>
      </div>

      {result && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            result.type === "success"
              ? "border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
              : "border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]"
          }`}
        >
          {result.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message to broadcast to all players..."
          required
          maxLength={500}
          disabled={busy}
          className="rd-input flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !message.trim()}
          className="rd-button-primary px-4 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Sending..." : "Broadcast"}
        </button>
      </form>
    </div>
  )
}
