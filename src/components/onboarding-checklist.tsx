"use client"

import { useState } from "react"
import Link from "next/link"

type Step = {
  id: string
  label: string
  description: string
  href: string
  completed: boolean
}

function getInitialDismissed(): boolean {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem("rd-checklist-dismissed") === "true"
  } catch {
    return false
  }
}

export default function OnboardingChecklist({
  hasGame,
  hasWebhookEvent,
  hasTeamMember,
  hasBilling,
}: {
  hasGame: boolean
  hasWebhookEvent: boolean
  hasTeamMember: boolean
  hasBilling: boolean
}) {
  const [dismissed, setDismissed] = useState(getInitialDismissed)

  const steps: Step[] = [
    {
      id: "game",
      label: "Connect your first game",
      description: "Add a Roblox Place ID and copy the webhook URL.",
      href: "/dashboard/games/new",
      completed: hasGame,
    },
    {
      id: "webhook",
      label: "Send your first event",
      description: "Install the Luau module and fire an HTTP request.",
      href: "/dashboard/guide",
      completed: hasWebhookEvent,
    },
    {
      id: "team",
      label: "Invite a team member",
      description: "Share your workspace with colleagues or moderators.",
      href: "/dashboard/settings",
      completed: hasTeamMember,
    },
    {
      id: "billing",
      label: "Upgrade your plan",
      description: "Unlock moderation, analytics, and more.",
      href: "/dashboard/billing",
      completed: hasBilling,
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const allCompleted = completedCount === steps.length

  if (dismissed || allCompleted) return null

  function handleDismiss() {
    setDismissed(true)
    try {
      localStorage.setItem("rd-checklist-dismissed", "true")
    } catch {}
  }

  return (
    <div
      className="rounded-2xl border p-6"
      style={{ background: "#1e1e1e", borderColor: "#2a2a2a" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="rd-label">Getting started</p>
          <p className="mt-1 text-xs" style={{ color: "#666666" }}>
            {completedCount}/{steps.length} completed
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-xs transition-colors hover:text-white"
          style={{ color: "#666666" }}
        >
          Dismiss
        </button>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "#2a2a2a" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(completedCount / steps.length) * 100}%`,
            background: "#e8822a",
          }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-[#252525]"
            >
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                style={{
                  background: step.completed
                    ? "rgba(74,222,128,0.15)"
                    : "#2a2a2a",
                  color: step.completed ? "#4ade80" : "#666666",
                  border: step.completed
                    ? "1px solid rgba(74,222,128,0.3)"
                    : "1px solid #3a3a3a",
                }}
              >
                {step.completed ? "✓" : ""}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-medium"
                  style={{ color: step.completed ? "#9ca3af" : "#fff" }}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "#666666" }}>
                  {step.description}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
