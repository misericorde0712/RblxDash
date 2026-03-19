import { redirect } from "next/navigation"
import { requireCurrentOrg } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { buildLiveEventsAddon } from "@/lib/roblox-addons"
import CopyButton from "../../copy-button"
import LiveEventsManager from "./live-events-manager"

export default async function GameEventsPage({
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
      eventVersion: true,
      liveEvents: {
        orderBy: [{ startsAt: "desc" }],
      },
    },
  })

  if (!game) {
    redirect("/dashboard/games")
  }

  const isAdmin = member.role === "ADMIN" || member.role === "OWNER"

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const addonScript = buildLiveEventsAddon({
    eventsUrl: `${appUrl}/api/webhook/${game.id}/events`,
    webhookSecret: game.webhookSecret,
  })

  return (
    <div className="rd-page-enter">
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
        style={{ borderBottom: "1px solid #242424" }}
      >
        <div>
          <h1 className="text-lg font-semibold text-white">Live Events</h1>
          <p className="mt-0.5 text-xs" style={{ color: "#888888" }}>
            {game.name} · Version {game.eventVersion}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Add-on install banner */}
        <div
          className="rounded-xl p-5"
          style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Luau Add-on required</p>
              <p className="mt-1 text-xs" style={{ color: "#888888" }}>
                Copy the script, create a <strong>ModuleScript</strong> in <code className="rounded px-1 py-0.5" style={{ background: "#111", color: "#e8822a" }}>ServerScriptService</code> named <code className="rounded px-1 py-0.5" style={{ background: "#111", color: "#e8822a" }}>RblxDashLiveEvents</code>, then paste the content.
                This is a separate add-on — your base RblxDash script does not need to be updated.
              </p>
            </div>
            <CopyButton
              value={addonScript}
              idleLabel="Copy script"
              copiedLabel="Copied!"
            />
          </div>
        </div>

        <LiveEventsManager
          gameId={game.id}
          initialEvents={game.liveEvents}
          initialVersion={game.eventVersion}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
