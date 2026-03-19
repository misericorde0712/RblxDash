"use client"

import { useState, useCallback } from "react"
type Milestone = { id: string; title: string; description: string }

function getUnseen(milestones: Milestone[]): Milestone[] {
  if (typeof window === "undefined") return []
  try {
    const dismissed = JSON.parse(localStorage.getItem("rd-celebrations") || "[]") as string[]
    return milestones.filter((m) => !dismissed.includes(m.id))
  } catch {
    return milestones
  }
}

export default function CelebrationToast({ milestones }: { milestones: Milestone[] }) {
  const [visible, setVisible] = useState<Milestone[]>(() => getUnseen(milestones))

  const dismiss = useCallback((id: string) => {
    setVisible((prev) => prev.filter((m) => m.id !== id))
    try {
      const dismissed = JSON.parse(localStorage.getItem("rd-celebrations") || "[]") as string[]
      dismissed.push(id)
      localStorage.setItem("rd-celebrations", JSON.stringify(dismissed))
    } catch {}
  }, [])

  if (visible.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3" style={{ maxWidth: "360px" }}>
      {visible.map((m) => (
        <div
          key={m.id}
          className="animate-in slide-in-from-bottom-4 rounded-xl p-4 shadow-2xl"
          style={{
            background: "#222222",
            border: "1px solid rgba(232,130,42,0.3)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(232,130,42,0.1)" }}
            >
              <span className="text-lg">🎉</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{m.title}</p>
              <p className="mt-0.5 text-xs" style={{ color: "#9ca3af" }}>
                {m.description}
              </p>
            </div>
            <button
              onClick={() => dismiss(m.id)}
              className="shrink-0 text-xs transition-colors hover:text-white"
              style={{ color: "#666666" }}
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
