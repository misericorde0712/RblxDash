import type { Metadata } from "next"
import { requireCurrentOrg } from "@/lib/auth"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { NO_INDEX_ROBOTS } from "@/lib/seo"
import { getPlanState } from "@/lib/stripe"
import SidebarShell from "./sidebar-shell"
import CurrentGameAlert from "./current-game-alert"

export const metadata: Metadata = {
  robots: NO_INDEX_ROBOTS,
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { org, currentGame, availableGames, billingSubscription, dbUser } =
    await requireCurrentOrg()
  const currentGameLabel = currentGame?.name ?? "Overview"
  const accountLabel = dbUser.name ?? dbUser.email
  const accountInitials =
    accountLabel
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "RD"

  const planState = getPlanState({
    plan: billingSubscription?.plan,
    createdAt: billingSubscription?.createdAt,
    status: billingSubscription?.status,
    currentPeriodEnd: billingSubscription?.currentPeriodEnd,
  })

  return (
    <SidebarShell
      orgName={org.name}
      currentGame={currentGame ? { id: currentGame.id, name: currentGame.name } : null}
      availableGames={availableGames.map((game) => ({
        id: game.id,
        name: game.name,
        orgName: game.orgName,
        orgSlug: game.orgSlug,
        role: game.role,
      }))}
      currentGameLabel={currentGameLabel}
      planLabel={planState.displayLabel}
      isTrialActive={planState.isTrialActive}
      trialDaysRemaining={planState.trialDaysRemaining}
      authMode={isSelfHostedMode() ? "local" : "clerk"}
      accountLabel={accountLabel}
      accountInitials={accountInitials}
    >
      {currentGame ? (
        <CurrentGameAlert gameId={currentGame.id} gameName={currentGame.name} />
      ) : null}
      {children}
    </SidebarShell>
  )
}
