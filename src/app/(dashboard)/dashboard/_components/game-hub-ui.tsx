import Link from "next/link"
import { HealthTone } from "@/lib/game-hub"

export function HealthBadge({ tone, label }: { tone: HealthTone; label: string }) {
  const colorMap: Record<HealthTone, { bg: string; text: string; border: string }> = {
    healthy: { bg: "rgba(74,222,128,0.08)", text: "#4ade80", border: "rgba(74,222,128,0.2)" },
    warning: { bg: "rgba(251,191,36,0.08)", text: "#fbbf24", border: "rgba(251,191,36,0.2)" },
    critical: { bg: "rgba(248,113,113,0.08)", text: "#f87171", border: "rgba(248,113,113,0.2)" },
    idle:    { bg: "rgba(156,163,175,0.08)", text: "#9ca3af", border: "rgba(156,163,175,0.2)" },
  }
  const c = colorMap[tone] ?? colorMap.idle

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: c.text }} />
      {label}
    </span>
  )
}

export function MetricCard({ title, value, detail, accent }: {
  title: string
  value: string
  detail: string
  accent?: "green" | "red" | "yellow" | "default"
  /** @deprecated kept for backwards-compat — has no visual effect */
  variant?: string
}) {
  const accentColor = {
    green: "#4ade80",
    red: "#f87171",
    yellow: "#fbbf24",
    default: "#9ca3af",
  }[accent ?? "default"]

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
    >
      <p className="text-xs font-medium" style={{ color: "#888888" }}>{title}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs" style={{ color: accentColor }}>{detail}</p>
    </div>
  )
}

export function NavCard({ title, icon, href }: {
  title: string
  icon: React.ReactNode
  href: string
}) {
  return (
    <Link
      href={href}
      className="rd-nav-card flex items-center gap-3 rounded-xl p-4 transition-colors duration-150"
    >
      <span style={{ color: "#e8822a" }}>{icon}</span>
      <span className="text-sm font-medium text-white">{title}</span>
      <svg className="ml-auto h-3.5 w-3.5" style={{ color: "#444444" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

/** @deprecated Use NavCard for new pages. Kept for backwards-compat on existing game pages. */
export function QuickLinkCard(props: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={props.href}
      className="rd-nav-card group block rounded-xl p-4 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{props.title}</p>
          <p className="mt-1 text-sm" style={{ color: "#9ca3af" }}>
            {props.description}
          </p>
        </div>
        <span className="text-xs font-bold uppercase tracking-[0.1em]" style={{ color: "#e8822a" }}>
          Open
        </span>
      </div>
    </Link>
  )
}
