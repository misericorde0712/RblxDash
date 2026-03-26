"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

const intervals = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly", badge: "Save 17%" },
  { id: "lifetime", label: "Lifetime" },
] as const

export type Interval = (typeof intervals)[number]["id"]

export function BillingIntervalToggle({ current }: { current: Interval }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (interval: Interval) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("interval", interval)
      router.replace(`?${params.toString()}`, { scroll: false })
    },
    [router, searchParams]
  )

  return (
    <div
      className="inline-flex rounded-xl p-1 gap-0.5"
      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
    >
      {intervals.map((interval) => (
        <button
          key={interval.id}
          onClick={() => handleChange(interval.id)}
          className="relative rounded-lg px-4 py-2 text-sm font-medium transition-all"
          style={
            current === interval.id
              ? { background: "#e8822a", color: "#fff" }
              : { background: "transparent", color: "#888" }
          }
        >
          {interval.label}
          {"badge" in interval && interval.badge && (
            <span
              className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
              style={
                current === interval.id
                  ? { background: "rgba(255,255,255,0.2)", color: "#fff" }
                  : { background: "rgba(74,222,128,0.1)", color: "#4ade80" }
              }
            >
              {interval.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
