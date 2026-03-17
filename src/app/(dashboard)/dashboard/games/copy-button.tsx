"use client"

import { useState } from "react"

export default function CopyButton({
  value,
  idleLabel = "Copy",
  copiedLabel = "Copied",
}: {
  value: string
  idleLabel?: string
  copiedLabel?: string
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
      className="shrink-0 rounded-lg border border-green-800 bg-green-950 px-3 py-2 text-xs font-medium text-green-200 transition hover:bg-green-900"
    >
      {copied ? copiedLabel : idleLabel}
    </button>
  )
}
