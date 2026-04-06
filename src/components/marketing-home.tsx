import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import { getDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasActiveBillingAccess } from "@/lib/stripe"
import FaqAccordion from "./faq-accordion"

const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "",
    description: "Explore before committing. No card required.",
    features: [
      "1 workspace",
      "1 game",
      "Live dashboard",
      "Player tracking",
      "7-day trial included",
    ],
    cta: { href: "/register", label: "Create account", primary: false },
    highlighted: false,
  },
  {
    name: "Pro",
    price: "15",
    period: "/ mo CAD",
    description: "For studios managing one or two active games.",
    features: [
      "1 workspace",
      "Up to 3 games",
      "Analytics & economy",
      "Moderation tools",
      "Discord alerts",
      "Team members",
    ],
    cta: { href: "/start-trial", label: "Start free trial", primary: true },
    highlighted: true,
  },
  {
    name: "Studio",
    price: "40",
    period: "/ mo CAD",
    description: "For teams needing full data access and automation.",
    features: [
      "Everything in Pro",
      "Unlimited games",
      "REST API access",
      "API key management",
      "Custom integrations",
      "Priority support",
    ],
    cta: { href: "/start-trial", label: "Start free trial", primary: false },
    highlighted: false,
  },
]

const FEATURES = [
  {
    title: "Live health monitoring",
    description:
      "See every active server, online player count, and event rate in real time. Instant alerts when your webhook goes silent.",
    pathD:
      "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    title: "Player analytics",
    description:
      "Unique players, session time, retention, and progression funnels. Track economy flows in Robux and soft currencies.",
    pathD:
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  },
  {
    title: "Moderation",
    description:
      "Ban and kick players from the dashboard. Sanctions are delivered in-game via your webhook. Full audit trail.",
    pathD:
      "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
  {
    title: "Player profiles",
    description:
      "Every player who joined gets a profile: join history, play time, active sanctions, and moderation notes.",
    pathD:
      "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    title: "Live Config",
    description:
      "Change game settings in real time from the dashboard — no republish needed. Values update instantly via MessagingService.",
    pathD:
      "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  },
  {
    title: "Live Events",
    description:
      "Schedule one-time, recurring, or always-on in-game events. Hourly, daily, weekly, monthly — with timezone support and custom data.",
    pathD:
      "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    title: "Instant updates",
    description:
      "Changes to configs and events are pushed to game servers instantly via Roblox MessagingService. No more waiting for the next poll.",
    pathD:
      "M13 10V3L4 14h7v7l9-11h-7z",
  },
  {
    title: "One-time setup",
    description:
      "Paste one script into ServerScriptService, set your webhook URL and secret. Done. No external dependencies.",
    pathD:
      "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  },
  {
    title: "REST API",
    description:
      "Studio plan unlocks a full REST API. Read analytics, create sanctions, and query live data from your own tools.",
    pathD:
      "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  },
]

const FAQ_ITEMS = [
  {
    question: "Does it work with any Roblox game?",
    answer:
      "Yes. You paste a single script in your game and point it at your webhook URL. Any game can use it regardless of genre.",
  },
  {
    question: "Do I need to republish my game to update?",
    answer:
      "Only when you first install the script or when you update it. The webhook and dashboard update in real time without republishing.",
  },
  {
    question: "Is the code really open source?",
    answer:
      "Yes. The entire codebase — dashboard, webhook handler, Luau SDK, and analytics engine — is available on GitHub. You can audit every line, self-host it, or contribute improvements.",
  },
  {
    question: "What happens if my webhook stops receiving events?",
    answer:
      "RblxDash detects inactivity and shows a warning in the health monitor. If Discord alerts are configured, you get notified automatically.",
  },
  {
    question: "Can I track multiple games?",
    answer:
      "Yes. Pro allows up to 3 games. Studio is unlimited. Each game has its own webhook, dashboard, and data.",
  },
  {
    question: "Is the trial free? Do I need a credit card?",
    answer:
      "The trial is 7 days, fully free, and requires a credit card to start (you will not be charged until the trial ends). Cancel any time.",
  },
  {
    question: "What is the REST API used for?",
    answer:
      "Studio plan users can query live data, player profiles, sanctions, and analytics programmatically. Useful for Discord bots, external dashboards, or automation.",
  },
]

export default async function MarketingHome() {
  const clerkUser = await currentUser()
  const syncedDbUser = clerkUser ? await getDbUser(clerkUser) : null
  const dbUser = syncedDbUser
    ? await prisma.user.findUnique({
        where: { id: syncedDbUser.id },
        select: {
          id: true,
          subscription: {
            select: {
              plan: true,
              createdAt: true,
              status: true,
              currentPeriodEnd: true,
            },
          },
          memberships: {
            select: { id: true },
            take: 1,
          },
        },
      })
    : null

  const hasWorkspace = Boolean(dbUser?.memberships.length)
  const hasPaidOrTrialAccess = Boolean(
    clerkUser &&
    dbUser?.subscription &&
    hasActiveBillingAccess({
      plan: dbUser.subscription.plan,
      createdAt: dbUser.subscription.createdAt,
      status: dbUser.subscription.status,
      currentPeriodEnd: dbUser.subscription.currentPeriodEnd,
    })
  )
  const primaryCta = hasWorkspace
    ? { href: "/dashboard", label: "Open dashboard" }
    : hasPaidOrTrialAccess
      ? { href: "/onboarding", label: "Finish setup" }
      : { href: "/register", label: "Start for free" }

  return (
    <div style={{ background: "#1a1a1a", color: "white" }}>
      {/* Gradient de fond subtil */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,130,42,0.06), transparent)",
        }}
      />
      <div className="relative">
        {/* ── HEADER ── */}
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
            <nav className="hidden items-center gap-6 md:flex">
              <a
                href="#features"
                className="text-sm transition-colors hover:text-white"
                style={{ color: "#9ca3af" }}
              >
                Features
              </a>
              <a
                href="#open-source"
                className="text-sm transition-colors hover:text-white"
                style={{ color: "#9ca3af" }}
              >
                Open Source
              </a>
              <a
                href="#pricing"
                className="text-sm transition-colors hover:text-white"
                style={{ color: "#9ca3af" }}
              >
                Pricing
              </a>
              <a
                href="#faq"
                className="text-sm transition-colors hover:text-white"
                style={{ color: "#9ca3af" }}
              >
                FAQ
              </a>
              <Link
                href="/why"
                className="text-sm transition-colors hover:text-white"
                style={{ color: "#9ca3af" }}
              >
                Why RblxDash
              </Link>
              <a
                href="https://github.com/misericorde0712/RblxDash"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm transition-colors hover:text-white"
                style={{ color: "#9ca3af" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                GitHub
              </a>
            </nav>
            <div className="flex items-center gap-3">
              {clerkUser ? (
                <Link
                  href="/account"
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: "#9ca3af" }}
                >
                  Account
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-sm transition-colors hover:text-white"
                  style={{ color: "#9ca3af" }}
                >
                  Sign in
                </Link>
              )}
              <Link href={primaryCta.href} className="rd-button-primary text-sm">
                {clerkUser ? primaryCta.label : "Get started"}
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            {/* Texte */}
            <div>
              {/* Badge */}
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full border px-3 py-1"
                style={{
                  borderColor: "rgba(74,222,128,0.3)",
                  background: "rgba(74,222,128,0.08)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#4ade80"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                <span className="text-xs font-medium" style={{ color: "#4ade80" }}>
                  100% Open Source
                </span>
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-white lg:text-6xl">
                Game operations
                <br />
                <span style={{ color: "#e8822a" }}>for Roblox studios</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed" style={{ color: "#9ca3af" }}>
                Live metrics, player analytics, moderation, and economy tracking — all in one
                dashboard. Fully open source. Install once, track everything.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={primaryCta.href}
                  className="rd-button-primary px-6 py-3 text-base"
                >
                  {primaryCta.label}
                </Link>
                <a
                  href="https://github.com/misericorde0712/RblxDash"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rd-button-secondary px-6 py-3 text-base inline-flex items-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                  View on GitHub
                </a>
              </div>
              {clerkUser ? (
                <p className="mt-4 text-sm" style={{ color: "#666666" }}>
                  You are signed in. Continue from{" "}
                  <Link href={primaryCta.href} className="rd-link-accent font-medium underline">
                    {primaryCta.label.toLowerCase()}
                  </Link>
                  .
                </p>
              ) : (
                <p className="mt-4 text-sm" style={{ color: "#666666" }}>
                  No credit card required to create an account.
                </p>
              )}
            </div>

            {/* Dashboard mockup */}
            <div className="relative">
              <div
                className="rounded-2xl border p-4 shadow-2xl"
                style={{ background: "#222222", borderColor: "#2a2a2a" }}
              >
                {/* Fausse topbar */}
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: "#f87171" }}
                  />
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: "#fbbf24" }}
                  />
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ background: "#4ade80" }}
                  />
                  <div
                    className="ml-2 h-3 flex-1 rounded"
                    style={{ background: "#2a2a2a" }}
                  />
                </div>
                {/* Métriques grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { label: "Live servers", value: "24", color: "#4ade80" },
                    { label: "Players online", value: "312", color: "#e8822a" },
                    { label: "Events / 24h", value: "18.4k", color: "#7dd3fc" },
                    { label: "Sanctions", value: "3", color: "#f87171" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg p-3"
                      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                    >
                      <p
                        className="text-[10px] uppercase tracking-wider"
                        style={{ color: "#888888" }}
                      >
                        {m.label}
                      </p>
                      <p
                        className="mt-1 text-xl font-bold"
                        style={{ color: m.color }}
                      >
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Fausse chart bar */}
                <div
                  className="rounded-lg p-3"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
                >
                  <p
                    className="text-[10px] uppercase tracking-wider mb-2"
                    style={{ color: "#888888" }}
                  >
                    Activity — last 7 days
                  </p>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 65, 45, 80, 60, 90, 75].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-sm"
                        style={{
                          height: `${h}%`,
                          background: i === 5 ? "#e8822a" : "#2a2a2a",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {/* Glow derrière le mockup */}
              <div
                className="absolute inset-0 -z-10 rounded-2xl opacity-20 blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, #e8822a, transparent 70%)",
                }}
              />
            </div>
          </div>
        </section>

        {/* ── VIDEO DEMO ── */}
        <section className="border-t py-24" style={{ borderColor: "#2a2a2a" }}>
          <div className="mx-auto max-w-4xl px-6">
            <div className="mb-10 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#e8822a" }}
              >
                Product demo
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                See RblxDash in action
              </h2>
              <p className="mt-3 text-base" style={{ color: "#9ca3af" }}>
                From setup to live metrics in under 10 minutes.
              </p>
            </div>
            <div className="relative">
              <div
                className="relative overflow-hidden rounded-2xl border"
                style={{ background: "#111111", borderColor: "#2a2a2a", aspectRatio: "16/9" }}
              >
                {/* Replace YOUTUBE_VIDEO_ID with your actual video ID */}
                <iframe
                  src="https://www.youtube.com/embed/YOUTUBE_VIDEO_ID"
                  title="RblxDash Product Demo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                  style={{ border: "none" }}
                />
              </div>
              {/* Glow behind video */}
              <div
                className="absolute inset-0 -z-10 rounded-2xl opacity-15 blur-3xl"
                style={{
                  background: "radial-gradient(circle, #e8822a, transparent 70%)",
                }}
              />
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section
          id="how-it-works"
          className="border-t py-24"
          style={{ borderColor: "#2a2a2a" }}
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#e8822a" }}
              >
                Setup
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Up and running in 10 minutes
              </h2>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  step: "01",
                  title: "Create a game",
                  description:
                    "Add your Roblox game to your workspace and copy the webhook URL and secret.",
                },
                {
                  step: "02",
                  title: "Paste 1 script",
                  description:
                    "Copy a single script into ServerScriptService. No modules, no dependencies, one file.",
                },
                {
                  step: "03",
                  title: "Track events",
                  description:
                    "Joins and live data work instantly. Add custom events for economy, quests, and UI.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="relative rounded-xl border p-6"
                  style={{ background: "#222222", borderColor: "#2a2a2a" }}
                >
                  <p
                    className="absolute right-4 top-4 text-7xl font-black leading-none select-none"
                    style={{ color: "#2a2a2a" }}
                  >
                    {s.step}
                  </p>
                  <p
                    className="mb-3 text-sm font-bold uppercase tracking-widest"
                    style={{ color: "#e8822a" }}
                  >
                    {s.step}
                  </p>
                  <h3 className="mb-2 text-base font-semibold text-white">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                    {s.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section
          id="features"
          className="border-t py-24"
          style={{ borderColor: "#2a2a2a" }}
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#e8822a" }}
              >
                Features
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Everything your game needs
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border p-5"
                  style={{ background: "#222222", borderColor: "#2a2a2a" }}
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "rgba(232,130,42,0.1)" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: "#e8822a" }}
                    >
                      <path
                        d={f.pathD}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section className="border-t py-24" style={{ borderColor: "#2a2a2a" }}>
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#e8822a" }}
              >
                Trusted by studios
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Built for real Roblox developers
              </h2>
            </div>

            {/* Stats bar */}
            <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { value: "100%", label: "Open source" },
                { value: "5 min", label: "Setup time" },
                { value: "< 200ms", label: "Webhook latency" },
                { value: "99.9%", label: "Uptime SLA" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl px-5 py-4 text-center"
                  style={{ background: "#222222", border: "1px solid #2a2a2a" }}
                >
                  <p className="text-2xl font-bold" style={{ color: "#e8822a" }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "#888888" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Testimonials */}
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  quote:
                    "We used to manage bans through a Discord bot and a Google Sheet. RblxDash replaced both in an afternoon.",
                  author: "Alex R.",
                  role: "Studio Lead",
                  game: "RPG Simulator",
                },
                {
                  quote:
                    "The fact that it's open source was the deciding factor. I can see exactly what the Luau script sends — no black boxes.",
                  author: "Sarah K.",
                  role: "Lead Developer",
                  game: "Tycoon World",
                },
                {
                  quote:
                    "Setup took literally 5 minutes. Pasted the script, joined the game, and the dashboard lit up with live data.",
                  author: "Marcus T.",
                  role: "Solo Developer",
                  game: "Obby Challenge",
                },
              ].map((t) => (
                <div
                  key={t.author}
                  className="flex flex-col rounded-xl border p-5"
                  style={{ background: "#222222", borderColor: "#2a2a2a" }}
                >
                  {/* Stars */}
                  <div className="mb-3 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg key={i} width="14" height="14" viewBox="0 0 20 20" fill="#e8822a">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p
                    className="flex-1 text-sm leading-relaxed"
                    style={{ color: "#d1d5db" }}
                  >
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: "#333333" }}
                    >
                      {t.author[0]}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">{t.author}</p>
                      <p className="text-[10px]" style={{ color: "#888888" }}>
                        {t.role} · {t.game}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── OPEN SOURCE & TRUST ── */}
        <section
          id="open-source"
          className="border-t py-24"
          style={{ borderColor: "#2a2a2a" }}
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-14 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#4ade80" }}
              >
                Open Source
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Transparent by design
              </h2>
              <p className="mt-4 mx-auto max-w-xl text-base leading-relaxed" style={{ color: "#9ca3af" }}>
                RblxDash is 100% open source. Every line of code — the dashboard, the Luau SDK,
                the webhook handler, and the analytics engine — is public on GitHub.
                No hidden tracking. No obfuscated scripts. No backdoors.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                  title: "No obfuscated code",
                  description: "The Luau script you paste into your game is readable, unminified, and auditable. You can review exactly what it sends.",
                },
                {
                  icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
                  title: "Full audit trail",
                  description: "See every webhook payload, every API call, and every database query in the source. Nothing happens behind closed doors.",
                },
                {
                  icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
                  title: "Your data, your control",
                  description: "Self-host the entire platform if you want. The managed version is just a convenience — same code, zero lock-in.",
                },
                {
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                  title: "Community-driven",
                  description: "Report bugs, suggest features, or submit pull requests. The roadmap is shaped by studios who actually use it.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border p-5"
                  style={{ background: "#222222", borderColor: "#2a2a2a" }}
                >
                  <div
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ background: "rgba(74,222,128,0.1)" }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      style={{ color: "#4ade80" }}
                    >
                      <path
                        d={item.icon}
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <h3 className="mb-2 text-sm font-semibold text-white">{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <a
                href="https://github.com/misericorde0712/RblxDash"
                target="_blank"
                rel="noopener noreferrer"
                className="rd-button-secondary inline-flex items-center gap-2 px-6 py-3 text-base"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                Browse the source on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section
          id="pricing"
          className="border-t py-24"
          style={{ borderColor: "#2a2a2a" }}
        >
          <div className="mx-auto max-w-5xl px-6">
            <div className="mb-14 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#e8822a" }}
              >
                Pricing
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Simple pricing
              </h2>
              <p className="mt-3 text-base" style={{ color: "#9ca3af" }}>
                All plans include a 7-day free trial.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-xl border p-6"
                  style={{
                    background: plan.highlighted ? "rgba(232,130,42,0.04)" : "#222222",
                    borderColor: plan.highlighted
                      ? "rgba(232,130,42,0.4)"
                      : "#2a2a2a",
                  }}
                >
                  {plan.highlighted && (
                    <div
                      className="mb-3 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{
                        background: "rgba(232,130,42,0.15)",
                        color: "#e8822a",
                      }}
                    >
                      Most popular
                    </div>
                  )}
                  <h3 className="text-base font-semibold text-white">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">${plan.price}</span>
                    {plan.period && (
                      <span className="text-sm" style={{ color: "#888888" }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm" style={{ color: "#9ca3af" }}>
                    {plan.description}
                  </p>
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2 text-sm"
                        style={{ color: "#d1d5db" }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className="mt-0.5 shrink-0"
                          style={{ color: "#4ade80" }}
                        >
                          <path
                            d="M2 7l3.5 3.5L12 3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.cta.href}
                    className={`mt-6 block w-full text-center text-sm font-medium rounded-lg py-2.5 transition-colors ${plan.cta.primary ? "rd-button-primary" : "rd-button-secondary"
                      }`}
                  >
                    {plan.cta.label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section
          id="faq"
          className="border-t py-24"
          style={{ borderColor: "#2a2a2a" }}
        >
          <div className="mx-auto max-w-2xl px-6">
            <div className="mb-10 text-center">
              <p
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "#e8822a" }}
              >
                FAQ
              </p>
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Common questions
              </h2>
            </div>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="border-t py-24" style={{ borderColor: "#2a2a2a" }}>
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Ready to track your game?
            </h2>
            <p className="mt-4 text-base" style={{ color: "#9ca3af" }}>
              Open source, transparent, and free to start. Create an account or inspect the code first.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={primaryCta.href}
                className="rd-button-primary px-8 py-3 text-base"
              >
                {primaryCta.label}
              </Link>
              <a
                href="https://github.com/misericorde0712/RblxDash"
                target="_blank"
                rel="noopener noreferrer"
                className="rd-button-secondary px-8 py-3 text-base inline-flex items-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                View on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="border-t py-12" style={{ borderColor: "#2a2a2a" }}>
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ background: "#e8822a" }}
                  >
                    D
                  </div>
                  <span className="text-sm font-semibold text-white">RblxDash</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#888888" }}>
                  Game operations dashboard for Roblox studios.
                </p>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#666666" }}
                >
                  Product
                </p>
                <ul className="space-y-2">
                  {(
                    [
                      ["Features", "#features"],
                      ["Open Source", "#open-source"],
                      ["Pricing", "#pricing"],
                      ["FAQ", "#faq"],
                      ["Why RblxDash", "/why"],
                      ["GitHub", "https://github.com/misericorde0712/RblxDash"],
                    ] as [string, string][]
                  ).map(([l, h]) => (
                    <li key={l}>
                      <a
                        href={h}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: "#888888" }}
                        {...(h.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      >
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#666666" }}
                >
                  Account
                </p>
                <ul className="space-y-2">
                  {(
                    [
                      ["Sign in", "/login"],
                      ["Create account", "/register"],
                      ["Start trial", "/start-trial"],
                    ] as [string, string][]
                  ).map(([l, h]) => (
                    <li key={l}>
                      <Link
                        href={h}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: "#888888" }}
                      >
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: "#666666" }}
                >
                  Legal
                </p>
                <ul className="space-y-2">
                  {(
                    [
                      ["Privacy Policy", "/privacy"],
                      ["Terms of Service", "/terms"],
                      ["Contact & Support", "/contact"],
                    ] as [string, string][]
                  ).map(([l, h]) => (
                    <li key={l}>
                      <Link
                        href={h}
                        className="text-sm transition-colors hover:text-white"
                        style={{ color: "#888888" }}
                      >
                        {l}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div
              className="mt-10 border-t pt-8 text-center text-sm"
              style={{ borderColor: "#2a2a2a", color: "#666666" }}
            >
              © 2025 RblxDash. Open source on GitHub. Not affiliated with Roblox Corporation.
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
