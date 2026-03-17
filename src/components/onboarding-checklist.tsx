"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Step = {
  id: string
  label: string
  description: string
  href: string
  completed: boolean
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
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("rd-checklist-dismissed") === "true") {
        setDismissed(true)
      }
    } catch {}
  }, [])

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
      label: "Receive your first event",
      description: "Paste the Luau script, publish, and join your game once.",
      href: "/dashboard/logs",
      completed: hasWebhookEvent,
    },
    {
      id: "team",
      label: "Invite a team member",
      description: "Add a moderator or admin to your workspace.",
      href: "/dashboard/settings",
      completed: hasTeamMember,
    },
    {
      id: "billing",
      label: "Set up billing",
      description: "Add a payment method to keep Pro features after your trial.",
      href: "/account",
      completed: hasBilling,
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const allDone = completedCount === steps.length
  const progress = Math.round((completedCount / steps.length) * 100)

  if (dismissed || allDone) return null

  function handleDismiss() {
    setDismissed(true)
    try {
      localStorage.setItem("rd-checklist-dismissed", "true")
    } catch {}
  }

  return (
    <div
      className="rounded-xl"
      style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div>
          <p className="text-sm font-semibold text-white">Get started with RblxDash</p>
          <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
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

      {/* Progress bar */}
      <div className="mx-5 mb-4 h-1.5 rounded-full" style={{ background: "#2a2a2a" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, background: "#e8822a" }}
        />
      </div>

      <ul>
        {steps.map((step, i) => (
          <li
            key={step.id}
            className="flex items-start gap-3 px-5 py-3"
            style={{
              borderTop: "1px solid #242424",
              opacity: step.completed ? 0.5 : 1,
            }}
          >
            {/* Checkbox */}
            <div
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
              style={{
                background: step.completed ? "#e8822a" : "transparent",
                border: step.completed ? "none" : "2px solid #444444",
              }}
            >
              {step.completed && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-medium"
                style={{
                  color: step.completed ? "#888888" : "#ffffff",
                  textDecoration: step.completed ? "line-through" : "none",
                }}
              >
                {step.label}
              </p>
              {!step.completed && (
                <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
                  {step.description}
                </p>
              )}
            </div>

            {!step.completed && (
              <Link
                href={step.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: i === completedCount ? "#e8822a" : "rgba(232,130,42,0.1)",
                  color: i === completedCount ? "#ffffff" : "#e8822a",
                }}
              >
                {i === completedCount ? "Start" : "Do this"}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
