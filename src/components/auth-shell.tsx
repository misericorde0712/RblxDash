import type { ReactNode } from "react"
import Link from "next/link"

export const AUTH_APPEARANCE = {
  elements: {
    rootBox: "w-full",
    card: "w-full rounded-xl border border-[#2a2a2a] bg-[#222222] p-0 shadow-none",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsBlockButton:
      "border border-[#2a2a2a] bg-[#1a1a1a] text-gray-100 hover:bg-[#262626]",
    socialButtonsBlockButtonText: "text-sm font-medium",
    dividerLine: "bg-[#2a2a2a]",
    dividerText: "text-[#888888]",
    formFieldLabel: "text-sm font-medium text-[#d1d5db]",
    formFieldInput:
      "rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] text-white placeholder:text-[#888888] focus:border-[#e8822a] focus:ring-[#e8822a]",
    formButtonPrimary:
      "rounded-lg bg-[#e8822a] text-white hover:bg-[#f1913f] shadow-none",
    footerActionText: "text-[#888888]",
    footerActionLink: "text-[#e8822a] hover:text-[#f1913f]",
    identityPreviewText: "text-[#d1d5db]",
    formResendCodeLink: "text-[#e8822a] hover:text-[#f1913f]",
    otpCodeFieldInput:
      "rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] text-white",
    alertText: "text-sm",
  },
} as const

export default function AuthShell({
  eyebrow,
  title,
  description,
  switchLabel,
  switchHref,
  switchText,
  topLinkHref = "/",
  topLinkLabel = "Back home",
  children,
}: {
  eyebrow: string
  title: string
  description: string
  switchLabel: string
  switchHref: string
  switchText: string
  topLinkHref?: string
  topLinkLabel?: string
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(232,130,42,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(232,130,42,0.08),_transparent_35%)]" />
        <div className="absolute left-8 top-20 h-44 w-44 rounded-full bg-[#e8822a]/10 blur-3xl" />
        <div className="absolute bottom-10 right-10 h-56 w-56 rounded-full bg-[#e8822a]/6 blur-3xl" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10">
          <section className="flex flex-col justify-between rounded-[24px] border border-[#2a2a2a] bg-[#222222] p-8 xl:p-10">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#e8822a]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8822a] text-xs font-bold text-[#1a1a1a]">
                    D
                  </span>
                  RblxDash
                </Link>
                <Link
                  href={topLinkHref}
                  className="rd-button-secondary"
                >
                  {topLinkLabel}
                </Link>
              </div>

              <div className="mt-16 max-w-xl">
                <p className="rd-label text-[#e8822a]">
                  {eyebrow}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  {title}
                </h1>
                <p className="mt-5 text-lg leading-8 text-[#9ca3af]">
                  {description}
                </p>
              </div>

              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: "Live operations",
                    copy: "See server heartbeats, player sessions, and recent issues in one place.",
                  },
                  {
                    title: "Gameplay tracking",
                    copy: "Track custom events, economy, progression, and Robux purchases from your own code.",
                  },
                  {
                    title: "Moderation control",
                    copy: "Send actions from the dashboard and confirm whether Roblox acknowledged them.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rd-card-muted p-4"
                  >
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[16px] border border-[#2a2a2a] bg-[#1d1d1d] p-5">
              <p className="rd-label">
                Why teams use it
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rd-card p-4">
                  <p className="text-2xl font-semibold text-white">7-day trial</p>
                  <p className="mt-2 text-sm text-[#9ca3af]">
                    Start with the full setup flow, then move to Pro or Studio.
                  </p>
                </div>
                <div className="rd-card p-4">
                  <p className="text-2xl font-semibold text-white">Live feed</p>
                  <p className="mt-2 text-sm text-[#9ca3af]">
                    Logs, health, analytics, and moderation stay scoped to the selected game.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-md rounded-[24px] border border-[#2a2a2a] bg-[#222222] p-6 xl:p-8">
              <div className="mb-6">
                <p className="rd-label text-[#e8822a]">
                  Account access
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                  {switchLabel}{" "}
                  <Link
                    href={switchHref}
                    className="font-medium text-[#e8822a] transition hover:text-[#f1913f]"
                  >
                    {switchText}
                  </Link>
                </p>
              </div>
              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
