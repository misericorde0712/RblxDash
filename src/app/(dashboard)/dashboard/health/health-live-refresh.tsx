"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

function formatRefreshTime(value: Date) {
  return value.toLocaleTimeString("en-CA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function HealthLiveRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date())

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return
      }

      const nextSearchParams = new URLSearchParams(searchParams.toString())
      nextSearchParams.set("_live", String(Date.now()))
      const nextUrl = `${pathname}?${nextSearchParams.toString()}`

      router.replace(nextUrl, {
        scroll: false,
      })
      setLastRefreshAt(new Date())
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [pathname, router, searchParams])

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-900 bg-cyan-950/50 px-4 py-3 text-sm text-cyan-100">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
        <span>Live health is on. Server and player counters refresh every 5 seconds.</span>
      </div>
      <p className="text-xs text-cyan-200/80">
        Last refresh {formatRefreshTime(lastRefreshAt)}
      </p>
    </div>
  )
}
