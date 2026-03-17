"use client"

import { useState } from "react"

export default function DocsCopyButton({ value }: { value: string }) {
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
      className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-all duration-150"
      style={{
        borderColor: copied ? "rgba(74,222,128,0.3)" : "#333",
        background:  copied ? "rgba(74,222,128,0.07)" : "#1e1e1e",
        color:       copied ? "#4ade80" : "#666",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}
