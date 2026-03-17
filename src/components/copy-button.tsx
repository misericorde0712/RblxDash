"use client"

import { useState } from "react"

export default function CopyButton({
  value,
  label = "Copy",
}: {
  value: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
        copied
          ? "border-[rgba(74,222,128,0.24)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
          : "border-[#3a3a3a] bg-[#2a2a2a] text-[#d1d5db] hover:border-[rgba(232,130,42,0.35)] hover:text-white"
      }`}
    >
      {copied ? "Copied" : label}
    </button>
  )
}
