import type { ReactNode } from "react"
import Link from "next/link"
import { requireCurrentOrg } from "@/lib/auth"
import { getBillingUsageSummary } from "@/lib/billing"
import { getPlanState } from "@/lib/stripe"
import { redirectToBillingPortal, redirectToCheckout } from "./actions"

// ─── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    id:    "FREE"   as const,
    name:  "Free",
    price: null,
    desc:  "Get started with one game.",
    features: [
      "1 game",
      "1 workspace",
      "7-day log retention",
      "Players & Logs",
    ],
    missing: [
      "Analytics & moderation",
      "REST API access",
    ],
  },
  {
    id:        "PRO" as const,
    name:      "Pro",
    price:     "15 CAD",
    highlight: true,
    desc:      "For active Roblox creators.",
    features: [
      "5 games",
      "3 workspaces",
      "30-day log retention",
      "All modules (analytics, moderation…)",
      "7-day free trial",
    ],
    missing: [
      "REST API access",
    ],
  },
  {
    id:    "STUDIO" as const,
    name:  "Studio",
    price: "40 CAD",
    desc:  "For teams and power users.",
    features: [
      "Unlimited games",
      "Unlimited workspaces",
      "90-day log retention",
      "All modules",
      "REST API access",
      "7-day free trial",
    ],
    missing: [],
  },
]

// ─── Components ───────────────────────────────────────────────────────────────
function FeatureRow({ text, included }: { text: string; included: boolean }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold"
        style={
          included
            ? { background: "rgba(74,222,128,0.12)", color: "#4ade80",  border: "1px solid rgba(74,222,128,0.2)" }
            : { background: "rgba(156,163,175,0.06)", color: "#444",    border: "1px solid #2a2a2a" }
        }
      >
        {included ? "✓" : "—"}
      </span>
      <span style={{ color: included ? "#ccc" : "#555" }}>{text}</span>
    </li>
  )
}

function UsageBar({ used, max }: { used: number; max: number }) {
  const pct = Number.isFinite(max) ? Math.min(100, (used / max) * 100) : 0
  const overLimit = Number.isFinite(max) && used > max
  return (
    <div
      className="mt-1.5 h-1 w-full overflow-hidden rounded-full"
      style={{ background: "#252525" }}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: Number.isFinite(max) ? `${pct}%` : "0%",
          background: overLimit ? "#f87171" : "#e8822a",
        }}
      />
    </div>
  )
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-white mb-4">{children}</h2>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { org, billingOwner, billingSubscription } = await requireCurrentOrg()
  const usage = await getBillingUsageSummary({
    billingOwnerId: billingOwner.id,
    subscription:   billingSubscription,
    currentOrgId:   org.id,
  })

  const planState = billingSubscription
    ? getPlanState({
        plan:             billingSubscription.plan,
        createdAt:        billingSubscription.createdAt,
        status:           billingSubscription.status,
        currentPeriodEnd: billingSubscription.currentPeriodEnd,
      })
    : null

  const resolvedParams = (await searchParams) ?? {}
  const success  = resolvedParams?.success  === "1"
  const canceled = resolvedParams?.canceled === "1"

  const currentPlan  = usage.effectivePlan
  const hasActivePlan = usage.hasActivePlan
  const isTrial       = planState?.isTrialActive ?? false

  function formatDate(d: Date | null | undefined) {
    if (!d) return "–"
    return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(d)
  }

  return (
    <div className="rd-page-enter p-6 xl:p-8" style={{ maxWidth: "960px" }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Plan &amp; Billing</h1>
        <p className="mt-1 text-sm" style={{ color: "#888" }}>
          Billing applies to your account — it covers all your games and workspaces.
        </p>
      </div>

      {/* ── Toasts ────────────────────────────────────────────────────────── */}
      {success && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", color: "#86efac" }}
        >
          Checkout completed — your subscription will update as soon as the webhook is processed.
        </div>
      )}
      {canceled && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", color: "#fbbf24" }}
        >
          Checkout canceled. Your plan was not changed.
        </div>
      )}

      {/* ── Current status ────────────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl p-5" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: "#666" }}>
              Current plan
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-2xl font-semibold text-white">
                {usage.displayPlanLabel}
              </span>
              {isTrial && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(232,130,42,0.12)", color: "#e8822a", border: "1px solid rgba(232,130,42,0.25)" }}
                >
                  Trial — {planState!.trialDaysRemaining} day{planState!.trialDaysRemaining === 1 ? "" : "s"} left
                </span>
              )}
              {!hasActivePlan && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(156,163,175,0.08)", color: "#9ca3af", border: "1px solid #2a2a2a" }}
                >
                  No active plan
                </span>
              )}
            </div>
            {billingSubscription?.currentPeriodEnd && !isTrial && (
              <p className="mt-1 text-sm" style={{ color: "#666" }}>
                Renews {formatDate(billingSubscription.currentPeriodEnd)}
              </p>
            )}
            {isTrial && planState?.trialEndsAt && (
              <p className="mt-1 text-sm" style={{ color: "#888" }}>
                Trial ends {formatDate(planState.trialEndsAt)}
              </p>
            )}
          </div>

          {hasActivePlan && (
            <form action={redirectToBillingPortal}>
              <button
                type="submit"
                className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
                style={{ borderColor: "#333", background: "#252525", color: "#ccc" }}
              >
                Manage subscription →
              </button>
            </form>
          )}
        </div>

        {/* Usage */}
        {hasActivePlan && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 border-t pt-5" style={{ borderColor: "#242424" }}>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "#888" }}>Games</span>
                <span className="font-medium text-white">
                  {usage.totalGamesCount}
                  {Number.isFinite(usage.maxGames) ? ` / ${usage.maxGames}` : ""}
                </span>
              </div>
              {Number.isFinite(usage.maxGames) && (
                <UsageBar used={usage.totalGamesCount} max={usage.maxGames} />
              )}
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "#888" }}>Workspaces</span>
                <span className="font-medium text-white">
                  {usage.ownedOrganizationsCount}
                  {Number.isFinite(usage.maxOrganizations) ? ` / ${usage.maxOrganizations}` : ""}
                </span>
              </div>
              {Number.isFinite(usage.maxOrganizations) && (
                <UsageBar used={usage.ownedOrganizationsCount} max={usage.maxOrganizations} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Plan comparison ───────────────────────────────────────────────── */}
      <SectionTitle>
        {hasActivePlan ? "Your plan options" : "Choose a plan — 7-day free trial on all paid plans"}
      </SectionTitle>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent    = currentPlan === plan.id
          const isHighlighted = plan.highlight && !isCurrent
          const allFeatures  = [
            ...plan.features.map((f) => ({ text: f, included: true })),
            ...plan.missing.map((f)  => ({ text: f, included: false })),
          ]

          return (
            <div
              key={plan.id}
              className="flex flex-col rounded-2xl p-5"
              style={{
                background:  isCurrent ? "rgba(232,130,42,0.05)" : "#1e1e1e",
                border: isCurrent
                  ? "1px solid rgba(232,130,42,0.3)"
                  : isHighlighted
                    ? "1px solid #333"
                    : "1px solid #2a2a2a",
              }}
            >
              {/* Plan header */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-sm font-bold text-white">{plan.name}</p>
                  {isCurrent && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "rgba(232,130,42,0.15)", color: "#e8822a", border: "1px solid rgba(232,130,42,0.25)" }}
                    >
                      Current
                    </span>
                  )}
                  {isHighlighted && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
                    >
                      Popular
                    </span>
                  )}
                </div>
                {plan.price ? (
                  <p className="text-2xl font-semibold text-white">
                    {plan.price}
                    <span className="text-sm font-normal ml-1" style={{ color: "#666" }}>/month</span>
                  </p>
                ) : (
                  <p className="text-2xl font-semibold text-white">Free</p>
                )}
                <p className="mt-1 text-xs" style={{ color: "#666" }}>{plan.desc}</p>
              </div>

              {/* Features */}
              <ul className="flex-1 mb-5 space-y-2">
                {allFeatures.map((f) => (
                  <FeatureRow key={f.text} text={f.text} included={f.included} />
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div
                  className="rounded-xl px-4 py-2.5 text-center text-sm font-medium"
                  style={{ background: "#252525", color: "#555", border: "1px solid #2a2a2a" }}
                >
                  Current plan
                </div>
              ) : plan.id === "FREE" ? (
                // Downgrade to free goes through portal
                hasActivePlan ? (
                  <form action={redirectToBillingPortal}>
                    <button
                      type="submit"
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                      style={{ background: "#252525", color: "#888", border: "1px solid #2a2a2a" }}
                    >
                      Downgrade via portal
                    </button>
                  </form>
                ) : (
                  <div
                    className="rounded-xl px-4 py-2.5 text-center text-sm font-medium"
                    style={{ background: "#1a1a1a", color: "#555", border: "1px solid #242424" }}
                  >
                    No subscription needed
                  </div>
                )
              ) : currentPlan === "FREE" ? (
                // Start trial / checkout
                plan.id === "PRO" ? (
                  <Link
                    href="/start-trial"
                    className="block w-full rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors"
                    style={{ background: "#e8822a", color: "#fff" }}
                  >
                    Start 7-day trial
                  </Link>
                ) : (
                  <form action={redirectToCheckout.bind(null, "STUDIO")}>
                    <button
                      type="submit"
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                      style={{ background: "#252525", border: "1px solid #333", color: "#ccc" }}
                    >
                      Try Studio free
                    </button>
                  </form>
                )
              ) : (
                // Upgrade/change via portal
                <form action={redirectToBillingPortal}>
                  <button
                    type="submit"
                    className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={
                      plan.id === "STUDIO" && currentPlan === "PRO"
                        ? { background: "#e8822a", color: "#fff" }
                        : { background: "#252525", border: "1px solid #333", color: "#ccc" }
                    }
                  >
                    {plan.id === "STUDIO" && currentPlan === "PRO"
                      ? "Upgrade to Studio"
                      : "Switch plan via portal"}
                  </button>
                </form>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <div
        className="mt-6 rounded-xl px-4 py-3 text-sm"
        style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
      >
        <span style={{ color: "#888" }}>
          All plans are billed in CAD. Payments are processed by Stripe.
          For invoice questions, go to{" "}
          <Link href="/account" className="underline" style={{ color: "#e8822a" }}>
            your account
          </Link>
          .
        </span>
      </div>

      <div className="h-12" />
    </div>
  )
}
