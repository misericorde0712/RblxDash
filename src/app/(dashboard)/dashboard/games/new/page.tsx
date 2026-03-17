import Link from "next/link"
import { OrgRole } from "@prisma/client"
import { hasRequiredRole, requireCurrentOrg } from "@/lib/auth"
import { getBillingUsageSummary } from "@/lib/billing"
import { prisma } from "@/lib/prisma"
import NewGameForm from "./new-game-form"

function formatTrialDate(date: Date | null) {
  if (!date) {
    return null
  }

  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

export default async function NewGamePage() {
  const { dbUser, member, org, billingOwner, billingSubscription } =
    await requireCurrentOrg()

  const robloxConnection = await prisma.robloxConnection.findUnique({
    where: { userId: dbUser.id },
    select: {
      robloxUserId: true,
      robloxUsername: true,
      robloxDisplayName: true,
      scopes: true,
    },
  })

  const usage = await getBillingUsageSummary({
    billingOwnerId: billingOwner.id,
    subscription: billingSubscription,
    currentOrgId: org.id,
  })

  const canManageGames = hasRequiredRole(member.role, OrgRole.ADMIN)
  const canSubmit = canManageGames && usage.canCreateGame
  const blockingMessage = !canManageGames
    ? "Only admins and owners can add games to this workspace."
    : !usage.hasActivePlan
      ? "Open Account and start checkout before adding another game."
      : !usage.canCreateGame
        ? `This account already uses ${usage.totalGamesCount} of ${usage.maxGames} game slots. Upgrade or remove a game before adding another.`
        : null

  const gameLimitLabel = Number.isFinite(usage.maxGames)
    ? `${usage.totalGamesCount} / ${usage.maxGames}`
    : `${usage.totalGamesCount} / Unlimited`
  const trialEndLabel = formatTrialDate(usage.trialEndsAt ?? null)

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/dashboard/games"
            className="mb-2 inline-block text-sm text-gray-500 transition hover:text-gray-300"
          >
            ← Back to games
          </Link>
          <h1 className="text-3xl font-bold text-white">Add a game</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            This wizard keeps the manual setup path simple: create the game,
            install the Dashblox files, then run the validator from the game hub.
          </p>
        </div>

        {usage.isOverGameLimit ? (
          <div className="mb-6 rounded-2xl border border-yellow-900 bg-yellow-950/60 px-4 py-3 text-sm text-yellow-200">
            This account is currently over its game limit after a downgrade.
            Existing games stay visible, but no new games can be added until
            usage drops back under the plan limit.
          </div>
        ) : null}

        {!usage.hasActivePlan ? (
          <div className="mb-6 rounded-2xl border border-yellow-900 bg-yellow-950/60 px-4 py-3 text-sm text-yellow-200">
            This account does not have an active subscription yet. Open{" "}
            <Link href="/account" className="font-medium text-yellow-100 underline">
              Account
            </Link>{" "}
            to start checkout before connecting a game.
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                    Manual setup path
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    What will happen next
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                    Dashblox creates the game first. After that, you land on the
                    game hub with direct links to installation, docs, and the setup
                    validator.
                  </p>
                </div>

                <Link
                  href="/account"
                  className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
                >
                  Open account
                </Link>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {[
                  {
                    step: "1",
                    title: "Create the game",
                    copy: "Name it and save the Roblox Place ID.",
                  },
                  {
                    step: "2",
                    title: "Add access",
                    copy: "Paste an Open Cloud key or use a linked Roblox account.",
                  },
                  {
                    step: "3",
                    title: "Install files",
                    copy: "Copy the Dashblox files into ServerScriptService.",
                  },
                  {
                    step: "4",
                    title: "Run validator",
                    copy: "Confirm heartbeat, joins, events, economy, and progression.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="rounded-2xl border border-gray-800 bg-black/20 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                      Step {item.step}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <NewGameForm
              allowedModules={usage.availableModules}
              canSubmit={canSubmit}
              blockingMessage={blockingMessage}
              robloxConnection={robloxConnection}
            />
          </div>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Account status
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Billing and limits
              </h2>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Current plan
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {usage.displayPlanLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {usage.isTrialActive && trialEndLabel
                      ? `Trial access is active until ${trialEndLabel}.`
                      : usage.hasActivePlan
                        ? "Billing is active for this account."
                        : "No active subscription yet."}
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Game slots
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {gameLimitLabel}
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    Counted across every workspace billed to this account.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Modules available
                  </p>
                  <p className="mt-2 text-sm font-medium text-white">
                    {usage.availableModules.join(", ")}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Roblox access
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Manual path is the default
              </h2>

              {robloxConnection ? (
                <div className="mt-4 rounded-2xl border border-blue-900 bg-blue-950/30 p-4">
                  <p className="text-sm font-medium text-white">
                    Linked as{" "}
                    {robloxConnection.robloxDisplayName ||
                      robloxConnection.robloxUsername ||
                      robloxConnection.robloxUserId}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-blue-100/80">
                    You can still use the manual Open Cloud flow. The linked
                    Roblox account is kept for future authenticated Roblox features.
                  </p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-cyan-900 bg-cyan-950/30 p-4">
                  <p className="text-sm font-medium text-white">
                    Required for this wizard
                  </p>
                  <p className="mt-2 text-sm leading-6 text-cyan-100/80">
                    Roblox Place ID and an Open Cloud API key from the same
                    universe. OAuth remains private beta, so the manual path is
                    the supported setup flow right now.
                  </p>
                </div>
              )}

              <div className="mt-5 space-y-3 rounded-2xl border border-gray-800 bg-black/20 p-4 text-sm text-gray-300">
                <p className="font-medium text-white">Before you create the game</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• Keep the Place ID ready.</li>
                  <li>• Create an Open Cloud API key if no Roblox account is linked.</li>
                  <li>• Use Account for trial, billing, and connection status.</li>
                </ul>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/account"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Open account
                </Link>
                <Link
                  href="/dashboard/guide"
                  className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
                >
                  Open setup guide
                </Link>
              </div>
            </section>

            {blockingMessage ? (
              <section className="rounded-[1.75rem] border border-red-900 bg-red-950/40 p-6 text-sm text-red-200">
                <p className="font-medium text-white">Creation is blocked</p>
                <p className="mt-2 leading-6">{blockingMessage}</p>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
