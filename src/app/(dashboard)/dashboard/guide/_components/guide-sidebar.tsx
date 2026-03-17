"use client"

import { useEffect, useState } from "react"

const NAV = [
  {
    group: "Before you start",
    items: [
      { id: "overview",    label: "Overview" },
      { id: "what-you-get", label: "What you'll get" },
    ],
  },
  {
    group: "Installation",
    items: [
      { id: "download",       label: "Download the files" },
      { id: "step-runtime",   label: "1 · DashbloxRuntime" },
      { id: "step-module",    label: "2 · Dashblox module" },
      { id: "step-bootstrap", label: "3 · Bootstrap script" },
      { id: "step-http",      label: "4 · Enable HTTP" },
    ],
  },
  {
    group: "Verification",
    items: [
      { id: "step-publish", label: "Publish & test" },
      { id: "step-verify",  label: "Check connection" },
    ],
  },
  {
    group: "Troubleshooting",
    items: [
      { id: "mistakes", label: "Common mistakes" },
    ],
  },
] as const

const ALL_IDS = NAV.flatMap((g) => g.items.map((i) => i.id))

export default function GuideSidebar() {
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
    <nav aria-label="Guide navigation">
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
                      color:      isActive ? "#e8822a" : "#888",
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
