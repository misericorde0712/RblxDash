import { requireCurrentOrg } from "@/lib/auth"
import SidebarShell from "./sidebar-shell"
import CurrentGameAlert from "./current-game-alert"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { org, currentGame, availableGames } = await requireCurrentOrg()
  const currentGameLabel = currentGame?.name ?? "Overview"

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
    >
      {currentGame ? (
        <CurrentGameAlert gameId={currentGame.id} gameName={currentGame.name} />
      ) : null}
      {children}
    </SidebarShell>
  )
}
