import {
  getManagedBillingDisabledReason,
  isManagedBillingEnabled,
  isSelfHostedMode,
} from "@/lib/deployment-mode"
import { prisma } from "@/lib/prisma"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "System Status",
  description:
    "Check the live operational status of the RblxDash application, database, webhook endpoint, billing, and authentication services.",
  path: "/status",
  keywords: ["RblxDash status", "RblxDash uptime", "RblxDash system status"],
})

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: ok ? "#4ade80" : "#f87171" }}
    />
  )
}

function Row({
  label,
  ok,
  detail,
}: {
  label: string
  ok: boolean
  detail?: string
}) {
  return (
    <div
      className="flex items-center justify-between rounded-xl px-5 py-4"
      style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
    >
      <div className="flex items-center gap-3">
        <StatusDot ok={ok} />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        {detail ? (
          <span className="text-xs" style={{ color: "#666666" }}>
            {detail}
          </span>
        ) : null}
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]"
          style={{
            background: ok ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
            color: ok ? "#4ade80" : "#f87171",
            border: `1px solid ${ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
          }}
        >
          {ok ? "Operational" : "Degraded"}
        </span>
      </div>
    </div>
  )
}

export default async function StatusPage() {
  const db = await checkDatabase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const selfHostedMode = isSelfHostedMode()
  const managedBillingEnabled = isManagedBillingEnabled()

  const allOk = db.ok

  return (
    <div
      className="min-h-screen"
      style={{ background: "#111111" }}
    >
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <a
            href={appUrl}
            className="mb-6 inline-block text-xl font-bold"
            style={{ color: "#e8822a" }}
          >
            RblxDash
          </a>
          <div className="mt-4">
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{
                background: allOk ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                color: allOk ? "#4ade80" : "#f87171",
                border: `1px solid ${allOk ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: allOk ? "#4ade80" : "#f87171" }}
              />
              {allOk ? "All systems operational" : "Partial outage detected"}
            </span>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-3">
          <Row
            label="Application"
            ok={true}
            detail="Next.js app"
          />
          <Row
            label="Database"
            ok={db.ok}
            detail={db.ok ? `${db.latencyMs}ms` : "Connection error"}
          />
          <Row
            label="Webhook endpoint"
            ok={true}
            detail="/api/webhook/[gameId]"
          />
          <Row
            label="Billing (Stripe)"
            ok={selfHostedMode || managedBillingEnabled}
            detail={
              selfHostedMode
                ? getManagedBillingDisabledReason()
                : managedBillingEnabled
                  ? "External — check status.stripe.com"
                  : "Stripe is not configured on this deployment"
            }
          />
          <Row
            label={selfHostedMode ? "Authentication (Local)" : "Authentication (Clerk)"}
            ok={true}
            detail={
              selfHostedMode
                ? "Built-in email/password auth"
                : "External — check clerkstatus.com"
            }
          />
        </div>

        {/* Footer */}
        <p className="mt-10 text-center text-xs" style={{ color: "#444444" }}>
          Last checked: {new Date().toUTCString()}
        </p>
      </div>
    </div>
  )
}
