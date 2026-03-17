"use client"

import { useState } from "react"

type FaqItem = {
  question: string
  answer: string
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: open === i ? "rgba(232,130,42,0.3)" : "#2a2a2a", background: "#222222" }}
        >
          <button
            className="flex w-full items-center justify-between px-5 py-4 text-left"
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className="text-sm font-medium text-white">{item.question}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{
                color: "#888888",
                transform: open === i ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms ease",
                flexShrink: 0,
                marginLeft: "16px",
              }}
            >
              <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {open === i && (
            <div className="border-t px-5 pb-5 pt-4" style={{ borderColor: "#2a2a2a" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{item.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
