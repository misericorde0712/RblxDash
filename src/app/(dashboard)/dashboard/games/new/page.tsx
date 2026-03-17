import Link from "next/link"
import { OrgRole } from "@prisma/client"
import { hasRequiredRole, requireCurrentOrg } from "@/lib/auth"
import { getBillingUsageSummary } from "@/lib/billing"
import { prisma } from "@/lib/prisma"
import NewGameForm from "./new-game-form"

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
      ? "No active subscription. Open Account to start checkout before adding a game."
      : !usage.canCreateGame
        ? `Game limit reached (${usage.totalGamesCount}/${usage.maxGames}). Upgrade or remove a game first.`
        : null

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/games"
            className="mb-3 inline-flex items-center gap-1.5 text-sm transition"
            style={{ color: "#6b7280" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Games
          </Link>
          <h1 className="text-2xl font-bold text-white">Add a game</h1>
          <p className="mt-1.5 text-sm" style={{ color: "#9ca3af" }}>
            Connect a Roblox game to start tracking players, events, and moderation.
          </p>
        </div>

        {/* Banners */}
        {usage.isOverGameLimit && (
          <div
            className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ border: "1px solid rgba(234,179,8,0.25)", background: "rgba(234,179,8,0.06)", color: "#fef08a" }}
          >
            This account is over its game limit after a downgrade. No new games can be added until usage drops back under the plan limit.
          </div>
        )}

        {!usage.hasActivePlan && (
          <div
            className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ border: "1px solid rgba(234,179,8,0.25)", background: "rgba(234,179,8,0.06)", color: "#fef08a" }}
          >
            No active subscription.{" "}
            <Link href="/account" className="font-medium underline" style={{ color: "#fde047" }}>
              Open Account
            </Link>{" "}
            to start checkout before connecting a game.
          </div>
        )}

        <NewGameForm
          allowedModules={usage.availableModules}
          canSubmit={canSubmit}
          blockingMessage={blockingMessage}
          robloxConnection={robloxConnection}
        />
      </div>
    </div>
  )
}
