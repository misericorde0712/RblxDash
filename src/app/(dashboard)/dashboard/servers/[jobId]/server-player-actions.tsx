"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"

export default function ServerPlayerActions({
  robloxId,
}: {
  robloxId: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)

  async function handleKick() {
    setBusy(true)
    setResult(null)

    try {
      const response = await fetch(`/api/players/${robloxId}/sanctions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "KICK",
          reason: "Kicked from server management panel",
        }),
      })

      if (!response.ok) {
        setResult("error")
        return
      }

      setResult("success")
      setShowConfirm(false)
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setResult("error")
    } finally {
      setBusy(false)
    }
  }

  if (result === "success") {
    return (
      <span className="text-xs text-[#4ade80]">Kick sent</span>
    )
  }

  if (result === "error") {
    return (
      <button
        onClick={() => { setResult(null); setShowConfirm(false) }}
        className="text-xs text-[#f87171] transition hover:text-[#fca5a5]"
      >
        Failed — retry
      </button>
    )
  }

  if (showConfirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleKick}
          disabled={busy}
          className="rounded-md border border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.1)] px-2 py-1 text-xs font-medium text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.2)] disabled:opacity-50"
        >
          {busy ? "..." : "Confirm"}
        </button>
        <button
          onClick={() => setShowConfirm(false)}
          disabled={busy}
          className="text-xs text-[#666666] transition hover:text-[#9ca3af]"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="rounded-md border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-2 py-1 text-xs font-medium text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.15)]"
    >
      Kick
    </button>
  )
}
