"use client"

import { useEffect, useState } from "react"

const NAV = [
  {
    group: "Getting Started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "auto-tracking", label: "Auto-tracking" },
    ],
  },
  {
    group: "Luau SDK",
    items: [
      { id: "sdk-track-event", label: "trackEvent" },
      { id: "sdk-robux", label: "trackRobuxPurchase" },
      { id: "sdk-economy", label: "createEconomyTracker" },
      { id: "sdk-context", label: "withContext" },
    ],
  },
  {
    group: "Recipes",
    items: [
      { id: "recipe-custom", label: "Custom event" },
      { id: "recipe-dev-product", label: "Developer product" },
      { id: "recipe-game-pass", label: "Game pass" },
      { id: "recipe-shop", label: "Soft-currency shop" },
      { id: "recipe-quest", label: "Quest / Progression" },
    ],
  },
  {
    group: "REST API",
    items: [
      { id: "api-auth", label: "Authentication" },
      { id: "api-workspace", label: "Workspace" },
      { id: "api-keys", label: "API Keys" },
      { id: "api-games", label: "Games" },
      { id: "api-live", label: "Live" },
      { id: "api-players", label: "Players" },
      { id: "api-sanctions", label: "Sanctions" },
      { id: "api-logs", label: "Logs" },
      { id: "api-analytics", label: "Analytics" },
    ],
  },
] as const

const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id))

export default function DocsSidebar() {
  const [active, setActive] = useState("")

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    )

    ALL_IDS.forEach((id) => {
      const el = document.getElementById(id)
      if (el) obs.observe(el)
    })

    return () => obs.disconnect()
  }, [])

  return (
    <nav aria-label="Documentation navigation">
      {NAV.map((group) => (
        <div key={group.group} className="mb-6">
          <p
            className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.15em]"
            style={{ color: "#555" }}
          >
            {group.group}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive = active === item.id
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="flex items-center rounded-md px-3 py-1.5 text-sm transition-colors duration-100"
                    style={{
                      color: isActive ? "#e8822a" : "#888",
                      background: isActive ? "rgba(232,130,42,0.09)" : "transparent",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
