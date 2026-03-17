"use client"

import { useTransition } from "react"
import Link from "next/link"
import { createCheckoutSession } from "./checkout-action"

const BENEFITS = [
  { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "7 days free — no charge until the trial ends" },
  { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "Cancel anytime — one click in your account settings" },
  { icon: "M13 10V3L4 14h7v7l9-11h-7z", text: "Full Pro features — analytics, moderation, 5 games, 30-day logs" },
  { icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z", text: "Secure checkout via Stripe — we never see your card" },
]

const TRUST_POINTS = [
  "No hidden fees",
  "Open source",
  "Data stays yours",
  "Self-host anytime",
]

export default function StartTrialClient() {
  const [isPending, startTransition] = useTransition()

  function handleStart() {
    startTransition(() => {
      createCheckoutSession()
    })
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "#1a1a1a" }}
    >
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "#e8822a" }}
          >
            RD
          </div>
          <span className="text-lg font-semibold text-white">RblxDash</span>
        </Link>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: "#222222", border: "1px solid #2a2a2a" }}
        >
          <div className="text-center">
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "rgba(232,130,42,0.1)" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
                <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white">Start your free trial</h1>
            <p className="mt-2 text-sm" style={{ color: "#9ca3af" }}>
              Try Pro for 7 days. If it is not for you, cancel before the trial ends and you will not be charged.
            </p>
          </div>

          {/* Benefits */}
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b.text} className="flex items-start gap-3">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 shrink-0"
                  style={{ color: "#4ade80" }}
                >
                  <path d={b.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm" style={{ color: "#d1d5db" }}>{b.text}</span>
              </li>
            ))}
          </ul>

          {/* Price preview */}
          <div
            className="mt-6 rounded-xl px-4 py-3 text-center"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
          >
            <p className="text-xs" style={{ color: "#888888" }}>After trial</p>
            <p className="mt-1 text-white">
              <span className="text-2xl font-bold">$15</span>
              <span className="text-sm" style={{ color: "#888888" }}> / mo CAD</span>
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleStart}
            disabled={isPending}
            className="rd-button-primary mt-6 w-full py-3 text-base font-semibold disabled:opacity-50"
          >
            {isPending ? "Redirecting to checkout..." : "Start 7-day free trial"}
          </button>

          {/* Trust points */}
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {TRUST_POINTS.map((point) => (
              <span key={point} className="text-xs" style={{ color: "#666666" }}>
                {point}
              </span>
            ))}
          </div>
        </div>

        {/* Back link */}
        <p className="mt-6 text-center text-sm" style={{ color: "#666666" }}>
          <Link href="/" className="transition-colors hover:text-white">
            &larr; Back to homepage
          </Link>
        </p>
      </div>
    </div>
  )
}
