"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  match?: "exact" | "prefix"
}

type NavSection = {
  label: string | null
  items: NavItem[]
}

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

const icons = {
  overview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  servers: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  health: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  logs: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  players: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  analytics: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  moderation: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  games: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  guide: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  docs: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  billing: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
}

function getNavSections(): NavSection[] {
  return [
    {
      label: null,
      items: [
        { href: "/dashboard", label: "Dashboard", icon: icons.overview, match: "exact" },
      ],
    },
    {
      label: "Game",
      items: [
        { href: "/dashboard/health",     label: "Health",     icon: icons.health },
        { href: "/dashboard/servers",     label: "Servers",    icon: icons.servers },
        { href: "/dashboard/logs",        label: "Logs",       icon: icons.logs },
        { href: "/dashboard/players",     label: "Players",    icon: icons.players },
        { href: "/dashboard/analytics",   label: "Analytics",  icon: icons.analytics },
        { href: "/dashboard/moderation",  label: "Moderation", icon: icons.moderation },
      ],
    },
    {
      label: "Workspace",
      items: [
        { href: "/dashboard/games",    label: "Games",    icon: icons.games },
        { href: "/dashboard/settings", label: "Settings", icon: icons.settings },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/dashboard/billing", label: "Billing", icon: icons.billing },
      ],
    },
    {
      label: "Developers",
      items: [
        { href: "/dashboard/guide", label: "Guide",  icon: icons.guide },
        { href: "/dashboard/docs",  label: "Docs",   icon: icons.docs  },
      ],
    },
  ]
}

export default function SidebarNav({
  currentGameId: _currentGameId,
  collapsed = false,
}: {
  currentGameId: string | null
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const sections = getNavSections()

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3">
      <div className="space-y-5">
        {sections.map((section, sectionIndex) => (
          <section key={sectionIndex}>
            {!collapsed && section.label !== null && (
              <p className="rd-label mb-2 px-2">{section.label}</p>
            )}

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`group flex items-center rounded-lg py-2 text-sm transition-colors duration-200 hover:bg-white/[0.03] hover:text-white ${collapsed ? "justify-center px-2" : "gap-2.5 px-3"}`}
                      style={{
                        background: active ? "rgba(232,130,42,0.15)" : "transparent",
                        color: active ? "#e8822a" : "#9ca3af",
                        border: active ? "1px solid rgba(232,130,42,0.22)" : "1px solid transparent",
                      }}
                    >
                      <span
                        style={{ color: active ? "#e8822a" : "#666666" }}
                        className="shrink-0 transition-colors duration-200 group-hover:text-white"
                      >
                        {item.icon}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate font-medium">{item.label}</span>
                          <span
                            className="ml-auto text-[10px] font-bold uppercase tracking-[0.1em]"
                            style={{ color: active ? "#e8822a" : "#4f4f4f" }}
                          >
                            •
                          </span>
                        </>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  )
}
