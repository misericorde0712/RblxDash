import Link from "next/link"
import { getGameHealthSnapshot } from "@/lib/game-monitoring"
import { prisma } from "@/lib/prisma"

export default async function CurrentGameAlert({
  gameId,
  gameName,
}: {
  gameId: string
  gameName: string
}) {
  const snapshot = await getGameHealthSnapshot(prisma, gameId)

  if (snapshot.health.tone !== "warning" && snapshot.health.tone !== "critical") {
    return null
  }

  const isCritical = snapshot.health.tone === "critical"

  return (
    <div
      className="px-6 py-3 text-sm"
      style={{
        background: isCritical ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.08)",
        borderBottom: `1px solid ${isCritical ? "rgba(248,113,113,0.2)" : "rgba(251,191,36,0.2)"}`,
        color: isCritical ? "#f87171" : "#fbbf24",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: isCritical ? "#f87171" : "#fbbf24" }}
          />
          <div>
            <strong>{gameName}</strong> needs attention: {snapshot.health.detail}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link href="/dashboard/health" className="font-semibold underline underline-offset-2">
            Open health
          </Link>
          <Link href="/dashboard/logs" className="font-semibold underline underline-offset-2">
            Open logs
          </Link>
          <Link href="/dashboard/guide" className="font-semibold underline underline-offset-2">
            Check setup
          </Link>
        </div>
      </div>
    </div>
  )
}
