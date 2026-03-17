import Link from "next/link"
import type { SetupValidatorItem } from "@/lib/game-monitoring"

function ValidatorRow({ item }: { item: SetupValidatorItem }) {
  const isComplete = item.status === "complete"

  return (
    <div className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{item.label}</p>
          <p className="mt-1 text-sm" style={{ color: "#888" }}>{item.detail}</p>
        </div>

        <div className="flex items-center gap-2">
          {item.required ? (
            <span className="rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide" style={{ border: "1px solid #333", color: "#ccc" }}>
              Required
            </span>
          ) : (
            <span className="rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide" style={{ border: "1px solid #2a2a2a", color: "#666" }}>
              Recommended
            </span>
          )}
          <span
            className="rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: isComplete ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)",
              border: `1px solid ${isComplete ? "rgba(74,222,128,0.35)" : "rgba(251,191,36,0.35)"}`,
              color: isComplete ? "#4ade80" : "#fbbf24",
            }}
          >
            {isComplete ? "Detected" : "Missing"}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SetupValidatorCard({
  title = "Integration validator",
  description = "Use this checklist to verify whether the current game is fully connected and whether your own custom tracking has started.",
  items,
  requiredComplete,
  completeRequiredCount,
  requiredCount,
  totalComplete,
  totalCount,
  compact = false,
}: {
  title?: string
  description?: string
  items: SetupValidatorItem[]
  requiredComplete: boolean
  completeRequiredCount: number
  requiredCount: number
  totalComplete: number
  totalCount: number
  compact?: boolean
}) {
  return (
    <section className="rounded-xl p-5" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm" style={{ color: "#888" }}>{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: requiredComplete ? "rgba(74,222,128,0.15)" : "rgba(251,191,36,0.15)",
              border: `1px solid ${requiredComplete ? "rgba(74,222,128,0.35)" : "rgba(251,191,36,0.35)"}`,
              color: requiredComplete ? "#4ade80" : "#fbbf24",
            }}
          >
            {requiredComplete ? "Base setup complete" : "Setup incomplete"}
          </span>
          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "#141414", border: "1px solid #333", color: "#ccc" }}>
            {completeRequiredCount}/{requiredCount} required
          </span>
          <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "#141414", border: "1px solid #333", color: "#ccc" }}>
            {totalComplete}/{totalCount} total
          </span>
        </div>
      </div>

      <div className={`mt-5 grid gap-3 ${compact ? "lg:grid-cols-2" : ""}`}>
        {items.map((item) => (
          <ValidatorRow key={item.key} item={item} />
        ))}
      </div>

      {!requiredComplete ? (
        <div className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.18)", color: "#bbb" }}>
          Finish the required checks first. If a required check stays missing,
          open <Link href="/dashboard/guide" className="underline" style={{ color: "#fbbf24" }}>Setup</Link> and
          verify the script, HTTP requests, and your first join test.
        </div>
      ) : (
        <div className="mt-5 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)", color: "#bbb" }}>
          Base setup is working. The remaining recommended checks are there to
          confirm your own gameplay systems such as economy, progression, and
          custom events.
        </div>
      )}
    </section>
  )
}
