import Link from "next/link"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Why Roblox Studios Choose RblxDash",
  description:
    "See why Roblox studios use RblxDash for live server monitoring, player analytics, moderation workflows, and open source transparency.",
  path: "/why",
  keywords: [
    "why RblxDash",
    "Roblox studio tools",
    "Roblox moderation dashboard",
    "Roblox analytics software",
    "open source Roblox SaaS",
  ],
})

const COMPARISONS = [
  {
    problem: "Manual moderation in Roblox Studio",
    solution: "Web dashboard with one-click bans, kicks, and full audit trail",
  },
  {
    problem: "No visibility into live servers",
    solution: "Real-time server list with player counts, heartbeat, and health status",
  },
  {
    problem: "Building custom analytics from scratch",
    solution: "Player tracking, session analytics, and economy metrics out of the box",
  },
  {
    problem: "Scattered tools across Discord bots and spreadsheets",
    solution: "One unified dashboard for moderation, analytics, logs, and team management",
  },
  {
    problem: "Closed-source tools you can't audit or customize",
    solution: "100% open source — read every line, self-host, or contribute",
  },
  {
    problem: "Expensive per-game pricing",
    solution: "Simple plans: Pro at $15/mo for up to 3 games, Studio at $40/mo for unlimited",
  },
]

const REASONS = [
  {
    title: "5-minute setup",
    description:
      "Paste one Luau script, set your webhook URL, and you're live. No external dependencies, no complex configuration.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "Built for Roblox",
    description:
      "Not a generic analytics tool — RblxDash understands Roblox-specific concepts like Place IDs, server instances, player sessions, and in-game economy.",
    icon: "M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l-2-1m2 1L2 6m2 1v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5",
  },
  {
    title: "Open source trust",
    description:
      "The Luau script you paste into your game is readable and unminified. The entire backend is on GitHub. No hidden telemetry or obfuscated code.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
  {
    title: "Team collaboration",
    description:
      "Invite moderators and admins with role-based access. Everyone sees the same dashboard, same data, same moderation tools.",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    title: "REST API for power users",
    description:
      "Studio plan unlocks a full API. Build Discord bots, external dashboards, or automation workflows on top of your RblxDash data.",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  },
  {
    title: "Self-host option",
    description:
      "Don't want to use the managed service? Clone the repo, set up a Postgres database, and deploy wherever you want. Zero lock-in.",
    icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2",
  },
]

export default function WhyRblxDashPage() {
  return (
    <div style={{ background: "#1a1a1a", color: "white" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(26,26,26,0.9)",
          borderColor: "#2a2a2a",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: "#e8822a" }}
            >
              D
            </div>
            <span className="text-sm font-semibold text-white">RblxDash</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm transition-colors hover:text-white"
              style={{ color: "#9ca3af" }}
            >
              Sign in
            </Link>
            <Link href="/register" className="rd-button-primary text-sm">
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p
          className="text-xs font-bold uppercase tracking-widest mb-4"
          style={{ color: "#e8822a" }}
        >
          Why RblxDash
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white lg:text-5xl">
          The game ops dashboard
          <br />
          <span style={{ color: "#e8822a" }}>Roblox studios actually need</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "#9ca3af" }}>
          Most studios manage moderation in-game, track analytics in spreadsheets, and coordinate across
          5 different tools. RblxDash replaces all of that with one open source dashboard.
        </p>
      </section>

      {/* Before / After */}
      <section className="border-t py-24" style={{ borderColor: "#2a2a2a" }}>
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-12 text-center text-2xl font-semibold text-white">
            Before vs. After
          </h2>
          <div className="space-y-3">
            {COMPARISONS.map((c) => (
              <div
                key={c.problem}
                className="grid gap-0 overflow-hidden rounded-xl md:grid-cols-2"
                style={{ border: "1px solid #2a2a2a" }}
              >
                <div className="px-5 py-4" style={{ background: "#1e1e1e" }}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#f87171" }}>
                    Before
                  </p>
                  <p className="text-sm" style={{ color: "#9ca3af" }}>{c.problem}</p>
                </div>
                <div className="px-5 py-4" style={{ background: "#222222" }}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "#4ade80" }}>
                    With RblxDash
                  </p>
                  <p className="text-sm" style={{ color: "#d1d5db" }}>{c.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reasons */}
      <section className="border-t py-24" style={{ borderColor: "#2a2a2a" }}>
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="mb-12 text-center text-2xl font-semibold text-white">
            6 reasons studios choose RblxDash
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((r) => (
              <div
                key={r.title}
                className="rounded-xl border p-5"
                style={{ background: "#222222", borderColor: "#2a2a2a" }}
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: "rgba(232,130,42,0.1)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: "#e8822a" }}>
                    <path d={r.icon} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">{r.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                  {r.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-24" style={{ borderColor: "#2a2a2a" }}>
        <div className="mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-white">
            Ready to try it?
          </h2>
          <p className="mt-4 text-base" style={{ color: "#9ca3af" }}>
            Start free, upgrade when you need more. Open source means zero lock-in.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/start-trial" className="rd-button-primary px-8 py-3 text-base">
              Start free trial
            </Link>
            <Link href="/" className="rd-button-secondary px-8 py-3 text-base">
              Back to homepage
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-sm"
        style={{ borderColor: "#2a2a2a", color: "#666666" }}
      >
        © 2025 RblxDash. Open source on GitHub. Not affiliated with Roblox Corporation.
      </footer>
    </div>
  )
}
