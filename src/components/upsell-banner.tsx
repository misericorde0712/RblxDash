"use client"

import { useState } from "react"
import Link from "next/link"

export default function UpsellBanner({
  type,
  current,
  limit,
  resource,
}: {
  type: "warning" | "reached"
  current: number
  limit: number
  resource: string
}) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const isReached = type === "reached"
  const percentage = Math.round((current / limit) * 100)

  return (
    <div
      className="flex items-start gap-3 rounded-xl px-4 py-3"
      style={{
        background: isReached
          ? "rgba(248,113,113,0.06)"
          : "rgba(251,191,36,0.06)",
        border: isReached
          ? "1px solid rgba(248,113,113,0.18)"
          : "1px solid rgba(251,191,36,0.18)",
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        className="mt-0.5 shrink-0"
        style={{ color: isReached ? "#f87171" : "#fbbf24" }}
      >
        <path
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: isReached ? "#f87171" : "#fbbf24" }}>
          {isReached
            ? `${resource} limit reached (${current}/${limit})`
            : `Approaching ${resource} limit (${current}/${limit} — ${percentage}%)`}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
          {isReached
            ? `You've reached your plan's ${resource} limit. Upgrade to unlock more capacity.`
            : `You're using ${percentage}% of your ${resource} allowance. Consider upgrading before you hit the limit.`}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="/account"
            className="rounded-lg px-3 py-1 text-xs font-medium text-white"
            style={{ background: "#e8822a" }}
          >
            Upgrade plan
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs transition-colors hover:text-white"
            style={{ color: "#666666" }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
