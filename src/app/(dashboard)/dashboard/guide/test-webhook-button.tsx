"use client"

import { useState } from "react"
import Link from "next/link"

type Status = "idle" | "loading" | "success" | "error"

export default function TestWebhookButton({ gameId }: { gameId: string }) {
  const [status, setStatus] = useState<Status>("idle")

  async function handleTest() {
    setStatus("loading")

    try {
      const res = await fetch(`/api/games/${gameId}/test-webhook`, {
        method: "POST",
      })

      if (res.ok) {
        setStatus("success")
        setTimeout(() => setStatus("idle"), 5000)
      } else {
        setStatus("error")
        setTimeout(() => setStatus("idle"), 5000)
      }
    } catch {
      setStatus("error")
      setTimeout(() => setStatus("idle"), 5000)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleTest}
        disabled={status === "loading"}
        className="rounded-lg border border-[#e8822a] bg-[rgba(232,130,42,0.08)] px-4 py-2 text-sm font-semibold text-[#e8822a] transition hover:bg-[rgba(232,130,42,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Sending..." : "Send test event"}
      </button>

      {status === "success" ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(74,222,128,0.08)",
            border: "1px solid rgba(74,222,128,0.2)",
            color: "#86efac",
          }}
        >
          Test event sent.{" "}
          <Link href="/dashboard/logs" className="font-semibold underline">
            Open Logs
          </Link>{" "}
          to confirm it appeared.
        </div>
      ) : null}

      {status === "error" ? (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            color: "#fca5a5",
          }}
        >
          The test failed. Check that the app is running and try again.
        </div>
      ) : null}
    </div>
  )
}
