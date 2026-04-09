import type { Metadata } from "next"
import Link from "next/link"
import { createPageMetadata } from "@/lib/seo"

export const metadata: Metadata = createPageMetadata({
  title: "Product Changelog",
  description:
    "Follow RblxDash releases, feature launches, product improvements, and bug fixes for the Roblox operations dashboard.",
  path: "/changelog",
  keywords: [
    "RblxDash changelog",
    "RblxDash releases",
    "Roblox analytics dashboard updates",
    "product release notes",
  ],
})

type Release = {
  version: string
  date: string
  tag: "feature" | "improvement" | "fix"
  title: string
  items: string[]
}

// Ajouter les nouvelles releases en haut de la liste
const RELEASES: Release[] = [
  {
    version: "0.1.0",
    date: "2025-03-17",
    tag: "feature",
    title: "Initial release",
    items: [
      "Live dashboard with server health monitoring",
      "Player tracking and profiles",
      "Moderation tools (ban, kick, timeout)",
      "Analytics with activity, economy, monetization, and progression views",
      "REST API (v1) for Studio plan holders",
      "Stripe billing integration with 7-day free trial",
      "Workspace management with role-based access (Moderator, Admin, Owner)",
      "Invitation system with 7-day token expiration",
      "Audit log for workspace actions",
      "Discord webhook alerts for moderation failures and dead webhooks",
      "Welcome, trial expiry, and engagement emails via Resend",
      "Setup guide with interactive walkthrough",
      "API documentation page",
    ],
  },
]

const TAG_STYLES: Record<Release["tag"], { bg: string; text: string; border: string; label: string }> = {
  feature: {
    bg: "rgba(74,222,128,0.1)",
    text: "#4ade80",
    border: "rgba(74,222,128,0.25)",
    label: "New",
  },
  improvement: {
    bg: "rgba(56,189,248,0.1)",
    text: "#7dd3fc",
    border: "rgba(56,189,248,0.25)",
    label: "Improved",
  },
  fix: {
    bg: "rgba(248,113,113,0.1)",
    text: "#fca5a5",
    border: "rgba(248,113,113,0.25)",
    label: "Fixed",
  },
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(26,26,26,0.9)",
          borderColor: "#2a2a2a",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "#e8822a" }}
            >
              D
            </div>
            <span className="text-sm font-semibold text-white">RblxDash</span>
          </Link>
          <Link href="/dashboard" className="rd-button-secondary text-sm">
            Open dashboard
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12">
          <p
            className="text-xs font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "#e8822a" }}
          >
            Changelog
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            What&apos;s new in RblxDash
          </h1>
          <p className="mt-3 text-base text-[#9ca3af]">
            All notable changes, new features, and fixes.
          </p>
        </div>

        <div className="space-y-12">
          {RELEASES.map((release) => {
            const tagStyle = TAG_STYLES[release.tag]
            return (
              <article
                key={release.version}
                className="rounded-xl border p-6"
                style={{ background: "#222222", borderColor: "#2a2a2a" }}
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-white">
                    v{release.version}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                    style={{
                      background: tagStyle.bg,
                      color: tagStyle.text,
                      border: `1px solid ${tagStyle.border}`,
                    }}
                  >
                    {tagStyle.label}
                  </span>
                  <span className="text-xs text-[#666]">{release.date}</span>
                </div>
                <h2 className="mb-3 text-base font-medium text-white">{release.title}</h2>
                <ul className="space-y-1.5">
                  {release.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-[#d1d5db]">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="mt-0.5 shrink-0"
                        style={{ color: tagStyle.text }}
                      >
                        <path
                          d="M2 7l3.5 3.5L12 3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </main>
    </div>
  )
}
