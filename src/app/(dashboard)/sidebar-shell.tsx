"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { SignOutButton, UserButton } from "@clerk/nextjs"
import type { ReactNode } from "react"
import type { OrgRole } from "@prisma/client"
import GameSwitcher from "./game-switcher"
import SidebarNav from "./sidebar-nav"


type GameOption = {
  id: string
  name: string
  orgName: string
  orgSlug: string
  role: OrgRole
}

type CurrentGame = {
  id: string
  name: string
} | null

export default function SidebarShell({
  children,
  orgName,
  currentGame,
  availableGames,
  currentGameLabel,
  planLabel = "Free",
  isTrialActive = false,
  trialDaysRemaining = 0,
}: {
  children: ReactNode
  orgName: string
  currentGame: CurrentGame
  availableGames: GameOption[]
  currentGameLabel: string
  planLabel?: string
  isTrialActive?: boolean
  trialDaysRemaining?: number
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Close mobile menu on route change (render-time check avoids setState in effect)
  const prevPathname = useRef(pathname)
  if (prevPathname.current !== pathname) {
    prevPathname.current = pathname
    setMobileOpen(false)
  }

  // Read persisted state only after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = localStorage.getItem("rd-sidebar-collapsed")
      if (stored === "true") setCollapsed(true)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem("rd-sidebar-collapsed", String(next))
      } catch {}
      return next
    })
  }

  return (
    <div className="flex h-full min-h-screen" style={{ background: "#1a1a1a" }}>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`rd-sidebar fixed inset-y-0 left-0 z-50 flex shrink-0 flex-col md:relative md:translate-x-0 transition-[width] duration-200 ${
          collapsed ? "w-16" : "w-56"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        style={{ background: "#222222", borderRight: "1px solid #333333" }}
      >
        {/* Logo */}
        <div
          className={`flex items-center py-4 ${collapsed ? "justify-center px-2" : "gap-2.5 px-4"}`}
          style={{ borderBottom: "1px solid #2a2a2a" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "#e8822a" }}
            >
              RD
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-semibold leading-tight text-white">RblxDash</p>
                <p className="text-[10px] leading-tight" style={{ color: "#666666" }}>
                  Game Operations
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className="absolute -right-3 top-[4.5rem] z-10 hidden h-6 w-6 items-center justify-center rounded-full border md:flex"
          style={{ background: "#222222", borderColor: "#444444", color: "#888888" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 250ms",
            }}
          >
            <path
              d="M7.5 2.5L4 6l3.5 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Game Switcher */}
        {!collapsed && (
          <div className="px-3 py-3" style={{ borderBottom: "1px solid #2a2a2a" }}>
            <GameSwitcher
              currentGameId={currentGame?.id ?? null}
              currentOrgName={orgName}
              games={availableGames}
            />
          </div>
        )}

        {/* Navigation */}
        <SidebarNav currentGameId={currentGame?.id ?? null} collapsed={collapsed} />

        {/* Bottom section: workspace + user */}
        <div className="px-3 pb-4 pt-3" style={{ borderTop: "1px solid #2a2a2a" }}>
          {!collapsed && (
            <div
              className="mb-3 rounded-xl px-3 py-2.5"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-[0.1em]"
                style={{ color: "#666666" }}
              >
                Workspace
              </p>
              <p className="mt-0.5 truncate text-sm font-medium text-white">{orgName}</p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em]"
                style={{
                  background: isTrialActive
                    ? "rgba(251,191,36,0.15)"
                    : "rgba(232,130,42,0.15)",
                  color: isTrialActive ? "#fbbf24" : "#e8822a",
                  border: isTrialActive
                    ? "1px solid rgba(251,191,36,0.2)"
                    : "1px solid rgba(232,130,42,0.2)",
                }}
              >
                {isTrialActive
                  ? `Trial — ${trialDaysRemaining}d left`
                  : `${planLabel} Plan`}
              </span>
              {isTrialActive && (
                <Link
                  href="/account"
                  className="mt-1.5 block text-[10px] font-medium transition-colors hover:text-white"
                  style={{ color: "#fbbf24" }}
                >
                  Upgrade now &rarr;
                </Link>
              )}
            </div>
          )}

          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: "#1d1d1d", border: "1px solid #2a2a2a" }}
          >
            {collapsed ? (
              /* Collapsed: only show avatar centered */
              <div className="flex flex-col items-center gap-2">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[1px]"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(232,130,42,0.95), rgba(245,158,11,0.5))",
                  }}
                >
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full"
                    style={{ background: "#222222" }}
                  >
                    <UserButton />
                  </div>
                </div>
                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    title="Log out"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border transition"
                    style={{
                      borderColor: "rgba(248,113,113,0.22)",
                      background: "rgba(248,113,113,0.08)",
                      color: "#fecaca",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </button>
                </SignOutButton>
              </div>
            ) : (
              /* Expanded: full user card */
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-[1px]"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(232,130,42,0.95), rgba(245,158,11,0.5))",
                      }}
                    >
                      <div
                        className="flex h-full w-full items-center justify-center rounded-full"
                        style={{ background: "#222222" }}
                      >
                        <UserButton />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="rd-label">Account</p>
                      <p className="truncate text-sm font-medium text-white">Signed in</p>
                    </div>
                  </div>
                  <Link href="/account" className="rd-link-accent text-xs font-semibold">
                    Manage
                  </Link>
                </div>

                <SignOutButton redirectUrl="/">
                  <button
                    type="button"
                    className="mt-3 flex w-full items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition"
                    style={{
                      borderColor: "rgba(248,113,113,0.22)",
                      background: "rgba(248,113,113,0.08)",
                      color: "#fecaca",
                    }}
                  >
                    Log out
                  </button>
                </SignOutButton>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-4 px-6"
          style={{ background: "#222222", borderBottom: "1px solid #2a2a2a" }}
        >
          {/* Hamburger — mobile only */}
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border md:hidden"
            style={{ borderColor: "#333333", color: "#9ca3af" }}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12M2 8h12M2 12h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm">
            <span style={{ color: "#9ca3af" }}>Dashboard</span>
            <span style={{ color: "#666666" }}>›</span>
            <span style={{ color: "#e8822a" }}>{currentGameLabel}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ background: "#1a1a1a" }}>
          {children}
        </main>
      </div>
    </div>
  )
}
