import type { ReactNode } from "react"
import Link from "next/link"
import { requireCurrentOrg } from "@/lib/auth"
import { getGameSetupValidator } from "@/lib/game-monitoring"
import { prisma } from "@/lib/prisma"
import GuideSidebar from "./_components/guide-sidebar"
import TestWebhookButton from "./test-webhook-button"
import CopyScriptButton from "./copy-script-button"
import { SetupValidatorCard } from "../_components/setup-validator-card"

// ─── Primitives ───────────────────────────────────────────────────────────────
function Divider() {
  return <hr className="my-10" style={{ borderColor: "#1e1e1e", borderTopWidth: 1 }} />
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: "#e8822a" }}>
      {children}
    </p>
  )
}

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-xl font-semibold text-white" style={{ scrollMarginTop: "32px" }}>
      {children}
    </h2>
  )
}

function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-base font-semibold text-white" style={id ? { scrollMarginTop: "32px" } : undefined}>
      {children}
    </h3>
  )
}

function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 mb-6 text-sm leading-relaxed" style={{ color: "#999" }}>
      {children}
    </p>
  )
}

function Callout({ type = "info", children }: { type?: "info" | "warning" | "tip"; children: ReactNode }) {
  const styles = {
    info: { bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)", icon: "ℹ", color: "#7dd3fc" },
    warning: { bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.18)", icon: "⚠", color: "#fbbf24" },
    tip: { bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.15)", icon: "✓", color: "#4ade80" },
  }[type]

  return (
    <div className="mb-5 flex gap-3 rounded-xl px-4 py-3 text-sm" style={{ background: styles.bg, border: `1px solid ${styles.border}` }}>
      <span style={{ color: styles.color, flexShrink: 0 }}>{styles.icon}</span>
      <span style={{ color: "#bbb" }}>{children}</span>
    </div>
  )
}

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="flex gap-4">
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ background: "rgba(232,130,42,0.12)", color: "#e8822a", border: "1px solid rgba(232,130,42,0.25)" }}
      >
        {n}
      </span>
      <p className="text-sm leading-relaxed" style={{ color: "#bbb" }}>{children}</p>
    </div>
  )
}

function Check({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 h-4 w-4 shrink-0 rounded flex items-center justify-center text-[10px] font-bold"
        style={{ background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}
      >
        ✓
      </span>
      <p className="text-sm leading-relaxed" style={{ color: "#bbb" }}>{children}</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function GuidePage() {
  const { org, currentGame } = await requireCurrentOrg()

  if (!currentGame) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Setup Guide</h1>
        <p className="mt-1 text-sm" style={{ color: "#888" }}>
          Select a game to get game-specific download links.
        </p>
        <div
          className="mt-8 rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(232,130,42,0.07)", border: "1px solid rgba(232,130,42,0.2)", color: "#e8822a" }}
        >
          No active game for <strong>{org.name}</strong>. Open{" "}
          <Link href="/dashboard/games" className="underline font-medium">Games</Link> first.
        </div>
      </div>
    )
  }

  const validator = await getGameSetupValidator(prisma, currentGame.id)

  const unifiedHref = `/api/games/${currentGame.id}/roblox-unified`
  const runtimeHref = `/api/games/${currentGame.id}/roblox-runtime`
  const moduleHref = `/api/games/${currentGame.id}/roblox-module`
  const bootstrapHref = `/api/games/${currentGame.id}/roblox-script`

  return (
    <div className="flex" style={{ minHeight: "100%" }}>

      {/* ── Left sticky nav ──────────────────────────────────────────────── */}
      <aside
        className="hidden xl:block shrink-0 self-start overflow-y-auto py-8"
        style={{
          width: "200px",
          position: "sticky",
          top: 0,
          maxHeight: "calc(100vh - 56px)",
          borderRight: "1px solid #1e1e1e",
          background: "#1a1a1a",
        }}
      >
        <div className="px-4">
          <GuideSidebar />
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-8 py-8" style={{ maxWidth: "820px" }}>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-white">Setup Guide</h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "rgba(232,130,42,0.1)", color: "#e8822a", border: "1px solid rgba(232,130,42,0.2)" }}
            >
              {currentGame.name}
            </span>
          </div>
          <p className="text-sm" style={{ color: "#888" }}>
            One file. Two steps. Under 3 minutes.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/docs"
              className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "#2a2a2a", background: "#1e1e1e", color: "#ccc" }}
            >
              SDK reference →
            </Link>
            <Link
              href={`/dashboard/games/${currentGame.id}`}
              className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "#2a2a2a", background: "#1e1e1e", color: "#ccc" }}
            >
              Game settings →
            </Link>
          </div>
        </div>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════
            STEP 1 — PASTE THE SCRIPT
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Step 1 of 2</Eyebrow>
          <H2 id="install">Paste the script into Roblox Studio</H2>
          <Lead>
            One self-contained file handles everything — live presence, player events, and moderation sync.
            No ModuleScripts, no naming conventions, no dependencies.
          </Lead>

          {/* The main action card */}
          <div
            className="mb-8 rounded-2xl p-6"
            style={{ background: "#1a1a1a", border: "1px solid rgba(232,130,42,0.2)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-base font-semibold text-white">DashbloxBootstrap.server.luau</p>
                <p className="mt-1 text-sm" style={{ color: "#888" }}>
                  Pre-configured for <strong className="text-white">{currentGame.name}</strong> — webhook URL and secret already embedded.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <CopyScriptButton href={unifiedHref} />
              </div>
            </div>

            <div className="space-y-3 pt-4" style={{ borderTop: "1px solid #252525" }}>
              <Step n={1}>In Roblox Studio, open <strong className="text-white">ServerScriptService</strong> in the Explorer.</Step>
              <Step n={2}>Right-click → <strong className="text-white">Insert Object</strong> → <strong className="text-white">Script</strong> (not a ModuleScript).</Step>
              <Step n={3}>Click <strong className="text-white">Copy to clipboard</strong> above, then paste into the new script.</Step>
              <Step n={4}>Name it anything — e.g. <strong className="text-white">DashbloxBootstrap</strong>.</Step>
            </div>
          </div>

          <Callout type="info">
            Already familiar with the 3-file setup?{" "}
            <a href="#advanced" style={{ color: "#e8822a", textDecoration: "underline" }}>
              Skip to the advanced section
            </a>{" "}
            for the separate Runtime + Module files.
          </Callout>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════
            STEP 2 — HTTP REQUESTS
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Step 2 of 2</Eyebrow>
          <H2 id="http">Enable HTTP requests</H2>
          <Lead>
            Roblox blocks outbound HTTP by default. This is the only setting you need to change.
          </Lead>

          <div className="mb-6 space-y-3">
            <Step n={1}>In Roblox Studio, go to <strong className="text-white">Home → Game Settings</strong>.</Step>
            <Step n={2}>Open the <strong className="text-white">Security</strong> tab.</Step>
            <Step n={3}>Toggle on <strong className="text-white">Allow HTTP Requests</strong>.</Step>
            <Step n={4}>Publish the game, then join it once.</Step>
          </div>

          <Callout type="warning">
            Without this, nothing will appear in Logs or Players. It is the single most common reason the setup appears to do nothing.
          </Callout>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════
            VERIFICATION
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Verification</Eyebrow>
          <H2 id="verify">Confirm the connection</H2>
          <Lead>After joining the game, these should all be green within seconds.</Lead>

          <div className="mb-6 space-y-3">
            <Check>
              <Link href="/dashboard/logs" className="underline font-medium" style={{ color: "#e8822a" }}>Logs</Link>
              {" "}shows a <code style={{ color: "#d4d4d4" }}>player_join</code> event.
            </Check>
            <Check>
              <Link href="/dashboard/players" className="underline font-medium" style={{ color: "#e8822a" }}>Players</Link>
              {" "}shows your Roblox username.
            </Check>
            <Check>
              Dashboard shows Live servers ≥ 1.
            </Check>
          </div>

          <div className="mb-8">
            <SetupValidatorCard
              title={`Live validation — ${currentGame.name}`}
              description="Real-time check based on events already received."
              items={validator.items}
              requiredComplete={validator.requiredComplete}
              completeRequiredCount={validator.completeRequiredItems.length}
              requiredCount={validator.requiredItems.length}
              totalComplete={validator.totalComplete}
              totalCount={validator.totalCount}
              compact
            />
          </div>

          <div className="rounded-xl p-5" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
            <p className="mb-1 text-sm font-semibold text-white">Not in Studio right now?</p>
            <p className="mb-4 text-sm" style={{ color: "#888" }}>
              Send a synthetic test event to confirm your webhook is reachable before publishing.
            </p>
            <TestWebhookButton gameId={currentGame.id} />
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════
            TROUBLESHOOTING
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Troubleshooting</Eyebrow>
          <H2 id="mistakes">Nothing showing up?</H2>
          <Lead>Check these in order — they cover 95% of failed installs.</Lead>

          <div className="space-y-3">
            {[
              {
                problem: "HTTP requests not enabled",
                fix: "Game Settings → Security → Allow HTTP Requests. Then republish.",
              },
              {
                problem: "Script is a ModuleScript instead of a Script",
                fix: "Delete and recreate as a Script. ModuleScripts don't run automatically.",
              },
              {
                problem: "Events in Studio playtest but not on Roblox",
                fix: "You need to Publish to Roblox first. Studio runs in a sandboxed environment.",
              },
              {
                problem: "Events appear once then stop",
                fix: "The Script is probably disabled or placed inside a LocalScript. Move it to ServerScriptService directly.",
              },
            ].map((item) => (
              <div key={item.problem} className="rounded-xl p-4" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                <p className="text-sm font-semibold text-white mb-1">{item.problem}</p>
                <p className="text-sm" style={{ color: "#888" }}>{item.fix}</p>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════
            ADVANCED — 3-FILE SETUP
        ════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Advanced</Eyebrow>
          <H2 id="advanced">3-file setup (optional)</H2>
          <Lead>
            If you prefer to keep the runtime and helper module as separate ModuleScripts — for example
            to require <code style={{ color: "#d4d4d4" }}>Dashblox</code> from multiple scripts — use
            these three files instead of the unified one above.
          </Lead>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "DashbloxRuntime",
                desc: "Core module (ModuleScript).",
                href: runtimeHref,
              },
              {
                title: "Dashblox",
                desc: "Helper module (ModuleScript).",
                href: moduleHref,
              },
              {
                title: "Bootstrap Script",
                desc: "Starts the runtime (Script).",
                href: bootstrapHref,
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl p-4"
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              >
                <p className="text-sm font-semibold text-white mb-1">{f.title}</p>
                <p className="mb-3 text-xs" style={{ color: "#666" }}>{f.desc}</p>
                <div className="flex gap-2">
                  <CopyScriptButton href={f.href} />
                </div>
              </div>
            ))}
          </div>

          <Callout type="info">
            Place all three in <strong style={{ color: "#ddd" }}>ServerScriptService</strong>.
            Name them exactly <code style={{ color: "#d4d4d4" }}>DashbloxRuntime</code>, <code style={{ color: "#d4d4d4" }}>Dashblox</code>,
            and anything for the bootstrap (it is a Script, not a ModuleScript).
          </Callout>
        </section>

        <div className="mt-10 rounded-xl px-4 py-3 text-sm" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
          <span className="font-medium text-white">Ready to add custom events?</span>{" "}
          <span style={{ color: "#888" }}>
            Head to{" "}
            <Link href="/dashboard/docs" className="underline" style={{ color: "#e8822a" }}>
              Developer Reference
            </Link>{" "}
            for Luau SDK recipes.
          </span>
        </div>

        <div className="h-16" />
      </div>
    </div>
  )
}
