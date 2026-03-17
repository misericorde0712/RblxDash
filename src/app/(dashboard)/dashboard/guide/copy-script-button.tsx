"use client"

import { useState } from "react"

type State = "idle" | "loading" | "copied" | "error"

export default function CopyScriptButton({ href }: { href: string }) {
  const [state, setState] = useState<State>("idle")

  async function handleCopy() {
    setState("loading")
    try {
      const res = await fetch(href)
      if (!res.ok) throw new Error("fetch failed")
      const text = await res.text()
      await navigator.clipboard.writeText(text)
      setState("copied")
      setTimeout(() => setState("idle"), 2500)
    } catch {
      setState("error")
      setTimeout(() => setState("idle"), 2500)
    }
  }

  const label =
    state === "loading" ? "Copying..." :
      state === "copied" ? "Copied!" :
        state === "error" ? "Failed to copy" :
          "Copy to clipboard"

  const isActive = state === "copied" || state === "error"

  return (
    <button
      onClick={handleCopy}
      disabled={state === "loading"}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-60"
      style={{
        background: isActive
          ? state === "copied" ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.15)"
          : "rgba(232,130,42,0.12)",
        border: `1px solid ${isActive
            ? state === "copied" ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"
            : "rgba(232,130,42,0.35)"
          }`,
        color: isActive
          ? state === "copied" ? "#4ade80" : "#f87171"
          : "#e8822a",
      }}
    >
      {state === "loading" ? (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
        </svg>
      ) : state === "copied" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" />
        </svg>
      )}
      {label}
    </button>
  )
}
