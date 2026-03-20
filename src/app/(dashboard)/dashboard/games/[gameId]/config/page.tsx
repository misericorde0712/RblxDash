import { redirect } from "next/navigation"
import { requireCurrentOrg } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import LiveConfigManager from "./live-config-manager"

export default async function GameConfigPage({
  params,
}: {
  params: Promise<{ gameId: string }>
}) {
  const { gameId } = await params
  const { org, member } = await requireCurrentOrg()

  const game = await prisma.game.findFirst({
    where: { id: gameId, orgId: org.id },
    select: {
      id: true,
      name: true,
      webhookSecret: true,
      configVersion: true,
      liveConfigs: {
        orderBy: [{ group: "asc" }, { key: "asc" }],
      },
    },
  })

  if (!game) {
    redirect("/dashboard/games")
  }

  const isAdmin = member.role === "ADMIN" || member.role === "OWNER"

  return (
    <div className="rd-page-enter">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid #242424" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white">Live Config</h1>
          <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
            {game.name} · Version {game.configVersion}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <LiveConfigManager
          gameId={game.id}
          initialConfigs={game.liveConfigs}
          initialVersion={game.configVersion}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
