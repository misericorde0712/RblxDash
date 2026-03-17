import Link from "next/link"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getBillingUsageSummary } from "@/lib/billing"
import { getPlanState, PLAN_LABELS } from "@/lib/stripe"
import {
  isRobloxOAuthConfigured,
} from "@/lib/roblox-oauth"
import { AccountActions } from "./account-actions"

const PLAN_PRICES = {
  PRO: "15 CAD / month",
  STUDIO: "40 CAD / month",
} as const

function formatDate(date: Date | null | undefined) {
  if (!date) {
    return "Not available"
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function sanitizeDetail(detail: string | string[] | undefined) {
  const candidate = Array.isArray(detail) ? detail[0] : detail

  if (!candidate) {
    return null
  }

  return candidate.replace(/[^\w\s\-.:/]/g, " ").trim()
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const clerkUser = await currentUser()
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      subscription: true,
      robloxConnection: true,
      memberships: {
        select: {
          role: true,
        },
      },
    },
  })

  const displayName =
    clerkUser?.fullName ??
    clerkUser?.username ??
    dbUser?.name ??
    clerkUser?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "Dashblox account"
  const email =
    clerkUser?.emailAddresses[0]?.emailAddress ?? dbUser?.email ?? "No email"
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  const planState = dbUser?.subscription
    ? getPlanState({
        plan: dbUser.subscription.plan,
        createdAt: dbUser.subscription.createdAt,
        status: dbUser.subscription.status,
        currentPeriodEnd: dbUser.subscription.currentPeriodEnd,
      })
    : null
  const joinedWorkspaceCount = dbUser?.memberships.length ?? 0
  const resolvedSearchParams = (await searchParams) ?? {}
  const success = resolvedSearchParams?.success === "1"
  const canceled = resolvedSearchParams?.canceled === "1"
  const robloxStatus = Array.isArray(resolvedSearchParams?.roblox)
    ? resolvedSearchParams.roblox[0]
    : resolvedSearchParams?.roblox
  const robloxDetails = sanitizeDetail(resolvedSearchParams?.details)
  const usage = dbUser
    ? await getBillingUsageSummary({
        billingOwnerId: dbUser.id,
        subscription: dbUser.subscription,
      })
    : null
  const canStartRobloxOAuth = isRobloxOAuthConfigured()
  const currentPlan = dbUser?.subscription?.plan ?? "FREE"
  const accountStateLabel = planState
    ? planState.isTrialActive
      ? `${planState.displayLabel} · ${planState.trialDaysRemaining} day${
          planState.trialDaysRemaining === 1 ? "" : "s"
        } left`
      : planState.displayLabel
    : "No billing yet"
  const accountStateCopy = planState?.isTrialActive
    ? `Your account unlocks ${PLAN_LABELS[planState.effectivePlan]} features until ${formatDate(planState.trialEndsAt)}.`
    : planState?.storedPlan === "FREE"
      ? "Start checkout to begin your 7-day trial and unlock games and workspaces."
      : "Billing is active for this account."

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(232,130,42,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(232,130,42,0.06),_transparent_35%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-10 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="rd-label text-[#e8822a]">Account</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Manage your account
              </h1>
              <p className="mt-3 text-sm leading-6 text-[#9ca3af]">
                Identity, billing, and Roblox access in one place.
              </p>
            </div>

            <Link href="/dashboard" className="rd-button-secondary">
              Open dashboard
            </Link>
          </div>

          {success ? (
            <div className="rd-banner rd-banner-success mt-8">
              Stripe Checkout completed. Your subscription will update as soon as the webhook is processed.
            </div>
          ) : null}

          {canceled ? (
            <div className="rd-banner rd-banner-warning mt-8">Checkout canceled.</div>
          ) : null}

          {robloxStatus === "connected" ? (
            <div className="rd-banner rd-banner-success mt-8">
              Roblox account connected successfully.
            </div>
          ) : null}

          {robloxStatus === "disconnected" ? (
            <div className="rd-banner rd-banner-warning mt-8">
              Roblox account disconnected.
            </div>
          ) : null}

          {robloxStatus === "not-configured" ? (
            <div className="rd-banner rd-banner-warning mt-8">
              Roblox OAuth is not configured on this environment yet.
            </div>
          ) : null}

          {robloxStatus === "error" ? (
            <div className="rd-banner rd-banner-danger mt-8">
              Roblox OAuth failed{robloxDetails ? `: ${robloxDetails}` : "."}
            </div>
          ) : null}

          <div className="mt-8 space-y-6">
            <section className="rd-card p-6 xl:p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#e8822a] text-xl font-semibold text-[#1a1a1a]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-semibold text-white">
                    {displayName}
                  </p>
                  <p className="mt-1 truncate text-sm text-[#9ca3af]">{email}</p>
                </div>
                <span className="rd-pill">{accountStateLabel}</span>
              </div>

              <div className="mt-5 rd-card-muted px-4 py-4">
                <p className="rd-label text-[#e8822a]">Current access</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {usage?.displayPlanLabel ?? accountStateLabel}
                </p>
                <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                  {accountStateCopy}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rd-card-muted px-4 py-4">
                  <p className="rd-label">Email</p>
                  <p className="mt-2 text-sm font-medium text-white">Primary</p>
                </div>
                <div className="rd-card-muted px-4 py-4">
                  <p className="rd-label">Security</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {clerkUser?.passwordEnabled ? "Password enabled" : "Password not set"}
                  </p>
                </div>
                <div className="rd-card-muted px-4 py-4">
                  <p className="rd-label">Workspaces</p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {joinedWorkspaceCount} joined
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-[#9ca3af]">
                <span className="rd-pill">
                  Member since {formatDate(dbUser?.createdAt ?? null)}
                </span>
                <span className="rd-pill">
                  Identity handled by Clerk
                </span>
              </div>
            </section>

            <section className="rd-card p-6 xl:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="rd-label text-[#e8822a]">Roblox</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Roblox connection
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                    Link your Roblox creator account to simplify authenticated
                    Roblox access inside Dashblox.
                  </p>
                </div>

                <span className="rd-pill">
                  {dbUser?.robloxConnection ? "Connected" : "Not connected"}
                </span>
              </div>

              {!canStartRobloxOAuth ? (
                <div className="rd-banner rd-banner-warning mt-5">
                  This deployment does not have Roblox OAuth credentials yet.
                </div>
              ) : null}

              {dbUser?.robloxConnection ? (
                <div className="mt-5 rd-card-muted p-5">
                  <div className="flex flex-wrap items-center gap-4">
                    {dbUser.robloxConnection.robloxAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={dbUser.robloxConnection.robloxAvatarUrl}
                        alt={dbUser.robloxConnection.robloxUsername ?? "Roblox avatar"}
                        className="h-14 w-14 rounded-xl border border-[#2a2a2a] object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] text-lg font-semibold text-white">
                        RB
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold text-white">
                        {dbUser.robloxConnection.robloxDisplayName ||
                          dbUser.robloxConnection.robloxUsername ||
                          "Connected Roblox account"}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#9ca3af]">
                        @{dbUser.robloxConnection.robloxUsername || "unknown"} · User ID{" "}
                        {dbUser.robloxConnection.robloxUserId}
                      </p>
                    </div>

                    {dbUser.robloxConnection.robloxProfileUrl ? (
                      <Link
                        href={dbUser.robloxConnection.robloxProfileUrl}
                        target="_blank"
                        className="rd-button-secondary"
                      >
                        Open Roblox profile
                      </Link>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rd-card px-4 py-4">
                      <p className="rd-label">Access token</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        Expires {formatDate(dbUser.robloxConnection.expiresAt)}
                      </p>
                    </div>
                    <div className="rd-card px-4 py-4">
                      <p className="rd-label">Granted scopes</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {dbUser.robloxConnection.scopes.length > 0
                          ? dbUser.robloxConnection.scopes.join(", ")
                          : "Not reported"}
                      </p>
                    </div>
                    <div className="rd-card px-4 py-4">
                      <p className="rd-label">Linked on</p>
                      <p className="mt-2 text-sm font-medium text-white">
                        {formatDate(dbUser.robloxConnection.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {canStartRobloxOAuth ? (
                      <Link
                        href="/api/roblox/oauth/start?redirectTo=/account"
                        className="rd-button-primary"
                      >
                        Reconnect Roblox
                      </Link>
                    ) : null}
                    <form action="/api/roblox/disconnect" method="POST">
                      <input type="hidden" name="redirectTo" value="/account" />
                      <button
                        type="submit"
                        className="rd-button-secondary"
                      >
                        Disconnect Roblox
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-[#3a3a3a] bg-[#1d1d1d] p-5">
                  <p className="text-sm leading-6 text-[#9ca3af]">
                    Connect Roblox to link your creator identity and prepare
                    Dashblox for authenticated Roblox API access without pasting
                    a key for every workflow.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    {canStartRobloxOAuth ? (
                      <Link
                        href="/api/roblox/oauth/start?redirectTo=/account"
                        className="rd-button-primary"
                      >
                        Connect Roblox
                      </Link>
                    ) : (
                      <span className="rd-pill">
                        OAuth not configured
                      </span>
                    )}
                    <p className="self-center text-sm text-[#666666]">
                      Manual Open Cloud setup stays available either way.
                    </p>
                  </div>
                </div>
              )}
            </section>

            <section className="rd-card p-6 xl:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="rd-label text-[#e8822a]">Identity controls</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Profile and security
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                    Open Clerk only when you actually need to edit something.
                  </p>
                </div>

                <span className="rd-pill">
                  Modal-based
                </span>
              </div>

              <div className="mt-5">
                <AccountActions />
              </div>
            </section>

            <section className="rd-card p-6 xl:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="rd-label text-[#e8822a]">Billing</p>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    Account billing
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
                    Billing is account-wide. Your plan follows this account across
                    all connected games and owned workspaces.
                  </p>
                </div>
                <span className="rd-pill">
                  Account-wide
                </span>
              </div>

              {!usage?.hasActivePlan ? (
                <div className="rd-banner rd-banner-warning mt-5">
                  This account does not have an active plan yet. Start checkout to begin the 7-day trial before adding games and workspaces.
                </div>
              ) : null}

              {usage?.isOverLimit ? (
                <div className="rd-banner rd-banner-warning mt-5">
                  This account is currently over its plan limits after a downgrade.
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rd-card-muted px-4 py-4">
                  <p className="rd-label">Current plan</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {usage?.displayPlanLabel ?? accountStateLabel}
                  </p>
                </div>
                <div className="rd-card-muted px-4 py-4">
                  <p className="rd-label">Games</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {usage
                      ? `${usage.totalGamesCount}${Number.isFinite(usage.maxGames) ? ` / ${usage.maxGames}` : ""}`
                      : "0"}
                  </p>
                </div>
                <div className="rd-card-muted px-4 py-4">
                  <p className="rd-label">Workspaces</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {usage
                      ? `${usage.ownedOrganizationsCount}${Number.isFinite(usage.maxOrganizations) ? ` / ${usage.maxOrganizations}` : ""}`
                      : "0"}
                  </p>
                </div>
              </div>

              {currentPlan === "FREE" ? (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  <Link
                    href="/start-trial"
                    className="rd-card-muted block px-5 py-4 hover:border-[#3a3a3a]"
                  >
                    <p className="rd-label text-[#e8822a]">Trial</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      Start 7-day trial
                    </p>
                    <p className="mt-1 text-sm text-[#9ca3af]">
                      Starts checkout for the Pro plan with a 7-day trial.
                    </p>
                  </Link>

                  <form action="/api/account/billing/checkout" method="POST">
                    <input name="plan" type="hidden" value="STUDIO" />
                    <button
                      className="rd-card-muted w-full px-5 py-4 text-left hover:border-[#3a3a3a]"
                      type="submit"
                    >
                      <p className="rd-label text-[#e8822a]">Studio</p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        Choose Studio instead
                      </p>
                      <p className="mt-1 text-sm text-[#9ca3af]">
                        {PLAN_PRICES.STUDIO} with unlimited billed games and API access.
                      </p>
                    </button>
                  </form>
                </div>
              ) : (
                <form action="/api/account/billing/portal" className="mt-5" method="POST">
                  <button
                    className="rd-button-primary w-full justify-between px-5 py-4 text-left"
                    type="submit"
                  >
                    <span>
                      <span className="rd-label block text-white/70">Subscription</span>
                      <span className="mt-2 block text-lg font-semibold text-white">
                        Manage plan
                      </span>
                      <span className="mt-1 block text-sm font-normal text-white/80">
                        Update payment details, upgrade, downgrade, or cancel from the billing portal.
                      </span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
