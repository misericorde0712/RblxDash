import { requireCurrentOrg } from "@/lib/auth"
import { getPlanState } from "@/lib/stripe"
import SidebarShell from "./sidebar-shell"
import CurrentGameAlert from "./current-game-alert"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { org, currentGame, availableGames, billingSubscription } =
    await requireCurrentOrg()
  const currentGameLabel = currentGame?.name ?? "Overview"

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
    >
      {currentGame ? (
        <CurrentGameAlert gameId={currentGame.id} gameName={currentGame.name} />
      ) : null}
      {children}
    </SidebarShell>
  )
}
