import type { ReactNode } from "react"
import Link from "next/link"
import { requireCurrentOrg } from "@/lib/auth"
import DocsSidebar from "./_components/docs-sidebar"
import DocsCopyButton from "./_components/docs-copy-button"

// ─── Method badge colours ─────────────────────────────────────────────────────
const M: Record<string, { bg: string; text: string; border: string }> = {
  GET: { bg: "rgba(56,189,248,0.1)", text: "#7dd3fc", border: "rgba(56,189,248,0.25)" },
  POST: { bg: "rgba(74,222,128,0.1)", text: "#86efac", border: "rgba(74,222,128,0.25)" },
  DELETE: { bg: "rgba(248,113,113,0.1)", text: "#fca5a5", border: "rgba(248,113,113,0.25)" },
  PATCH: { bg: "rgba(251,191,36,0.1)", text: "#fde68a", border: "rgba(251,191,36,0.25)" },
}

// ─── Layout primitives ────────────────────────────────────────────────────────
function Divider() {
  return <hr className="my-12" style={{ borderColor: "#1e1e1e", borderTopWidth: 1 }} />
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

function H3({
  id,
  children,
  mono,
}: {
  id?: string
  children: ReactNode
  mono?: boolean
}) {
  return (
    <h3
      id={id}
      className={`text-base font-semibold text-white ${mono ? "font-mono" : ""}`}
      style={id ? { scrollMarginTop: "32px" } : undefined}
    >
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

function P({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-sm leading-relaxed" style={{ color: "#999" }}>
      {children}
    </p>
  )
}

// ─── Code block ───────────────────────────────────────────────────────────────
function CodeBlock({ code, lang = "lua" }: { code: string; lang?: string }) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl" style={{ background: "#0f0f0f", border: "1px solid #232323" }}>
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ background: "#171717", borderBottom: "1px solid #1e1e1e" }}
      >
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: "#444" }}>
          {lang}
        </span>
        <DocsCopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed font-mono" style={{ color: "#d4d4d4" }}>
        {code}
      </pre>
    </div>
  )
}

// ─── Parameter / body table (inside an API endpoint card) ────────────────────
type Param = { name: string; type: string; description: string; required?: boolean }

function InlineParamTable({ title, params }: { title: string; params: Param[] }) {
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#555" }}>
        {title}
      </p>
      <table className="w-full text-xs">
        <tbody>
          {params.map((p, i) => (
            <tr key={p.name} style={{ borderTop: i > 0 ? "1px solid #1e1e1e" : undefined }}>
              <td className="py-1.5 pr-3 align-top font-mono" style={{ color: "#e8822a" }}>
                {p.name}
                {p.required && <span style={{ color: "#f87171" }}>*</span>}
              </td>
              <td className="py-1.5 pr-3 align-top font-mono" style={{ color: "#7dd3fc" }}>
                {p.type}
              </td>
              <td className="py-1.5 align-top" style={{ color: "#777" }}>
                {p.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── SDK function param table (standalone) ───────────────────────────────────
function ParamsTable({ params }: { params: Param[] }) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl" style={{ border: "1px solid #242424" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "#1e1e1e", borderBottom: "1px solid #242424" }}>
            <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#555" }}>Parameter</th>
            <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#555" }}>Type</th>
            <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#555" }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr
              key={p.name}
              style={{ background: "#191919", borderTop: i > 0 ? "1px solid #222" : undefined }}
            >
              <td className="px-4 py-2.5 align-top">
                <code className="font-mono" style={{ color: "#e8822a" }}>{p.name}</code>
                {p.required && (
                  <span className="ml-1 font-bold text-[10px]" style={{ color: "#f87171" }}>required</span>
                )}
              </td>
              <td className="px-4 py-2.5 align-top">
                <code className="font-mono" style={{ color: "#7dd3fc" }}>{p.type}</code>
              </td>
              <td className="px-4 py-2.5 align-top" style={{ color: "#888" }}>
                {p.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── REST API endpoint card ───────────────────────────────────────────────────
function ApiEndpoint({
  method,
  path,
  description,
  curl,
  queryParams,
  bodyParams,
}: {
  method: string
  path: string
  description: string
  curl: string
  queryParams?: Param[]
  bodyParams?: Param[]
}) {
  const s = M[method] ?? M.GET
  const hasLeft = (queryParams && queryParams.length > 0) || (bodyParams && bodyParams.length > 0)

  return (
    <div className="mb-4 overflow-hidden rounded-xl" style={{ border: "1px solid #2a2a2a" }}>
      {/* ── path bar ─────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-3"
        style={{ background: "#1e1e1e", borderBottom: "1px solid #242424" }}
      >
        <span
          className="shrink-0 rounded px-2 py-0.5 text-[11px] font-bold font-mono"
          style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
        >
          {method}
        </span>
        <code className="flex-1 min-w-0 text-xs font-mono" style={{ color: "#d4d4d4" }}>
          {path}
        </code>
        <DocsCopyButton value={curl} />
      </div>

      {/* ── two-column body ──────────────────────────────────────── */}
      <div className="grid xl:grid-cols-2" style={{ background: "#191919" }}>
        {/* Left: description + params */}
        <div
          className="border-b xl:border-b-0 xl:border-r p-4"
          style={{ borderColor: "#222" }}
        >
          <p className="text-sm" style={{ color: "#aaa" }}>{description}</p>
          {queryParams && queryParams.length > 0 && (
            <InlineParamTable title="Query parameters" params={queryParams} />
          )}
          {bodyParams && bodyParams.length > 0 && (
            <InlineParamTable title="Request body" params={bodyParams} />
          )}
          {!hasLeft && null}
        </div>

        {/* Right: curl example */}
        <pre
          className="overflow-x-auto p-4 text-xs leading-relaxed font-mono"
          style={{ background: "#0f0f0f", color: "#9ca3af" }}
        >
          {curl}
        </pre>
      </div>
    </div>
  )
}

// ─── Callout box ─────────────────────────────────────────────────────────────
function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "tip"
  children: ReactNode
}) {
  const styles = {
    info: { bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)", icon: "ℹ", color: "#7dd3fc" },
    warning: { bg: "rgba(251,191,36,0.06)", border: "rgba(251,191,36,0.18)", icon: "⚠", color: "#fbbf24" },
    tip: { bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.15)", icon: "✓", color: "#4ade80" },
  }[type]

  return (
    <div
      className="mb-5 flex gap-3 rounded-xl px-4 py-3 text-sm"
      style={{ background: styles.bg, border: `1px solid ${styles.border}` }}
    >
      <span style={{ color: styles.color, flexShrink: 0 }}>{styles.icon}</span>
      <span style={{ color: "#bbb" }}>{children}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DocsPage() {
  const { org, currentGame } = await requireCurrentOrg()

  if (!currentGame) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-white">Developer Reference</h1>
        <p className="mt-1 text-sm" style={{ color: "#888" }}>
          Select a game to see game-specific examples and pre-filled IDs.
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

  const BASE = "https://rblxdash.com"
  const GAME_ID = currentGame.id

  // ── Code snippets ────────────────────────────────────────────────────────────
  const SIG_TRACK_EVENT = `Dashblox.trackEvent(player, eventName, payload?)`

  const EX_TRACK_EVENT = `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

-- Minimal call
Dashblox.trackEvent(player, "shop_opened")

-- With payload
Dashblox.trackEvent(player, "item_crafted", {
    itemId    = "sword_iron",
    materials = "3x iron_ore",
})`

  const SIG_TRACK_ROBUX = `Dashblox.trackRobuxPurchase(player, productType, robuxAmount, payload?)`

  const EX_DEV_PRODUCT = `local MarketplaceService = game:GetService("MarketplaceService")
local Players           = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox          = require(ServerScriptService:WaitForChild("Dashblox"))

MarketplaceService.ProcessReceipt = function(receiptInfo)
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    -- ← your reward logic here

    Dashblox.trackRobuxPurchase(player, "developer_product", 99, {
        productId   = receiptInfo.ProductId,
        receiptId   = receiptInfo.PurchaseId,
        productName = "Starter Pack",
    })

    return Enum.ProductPurchaseDecision.PurchaseGranted
end`

  const EX_GAME_PASS = `-- ── Server script ─────────────────────────────────────────
local MarketplaceService  = game:GetService("MarketplaceService")
local ReplicatedStorage   = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox            = require(ServerScriptService:WaitForChild("Dashblox"))

local TrackGamePass        = Instance.new("RemoteEvent")
TrackGamePass.Name         = "TrackGamePass"
TrackGamePass.Parent       = ReplicatedStorage

TrackGamePass.OnServerEvent:Connect(function(player, gamePassId)
    local ok, owns = pcall(function()
        return MarketplaceService:UserOwnsGamePassAsync(player.UserId, gamePassId)
    end)
    if not ok or not owns then return end

    Dashblox.trackRobuxPurchase(player, "game_pass", 249, {
        gamePassId = gamePassId,
    })
end)

-- ── LocalScript (in StarterPlayerScripts or purchase UI) ──
local MarketplaceService = game:GetService("MarketplaceService")
local ReplicatedStorage  = game:GetService("ReplicatedStorage")
local Players            = game:GetService("Players")

local player        = Players.LocalPlayer
local TrackGamePass = ReplicatedStorage:WaitForChild("TrackGamePass")
local VIP_PASS_ID   = 123456789   -- ← replace with your pass ID

MarketplaceService.PromptGamePassPurchaseFinished:Connect(function(userId, passId, purchased)
    if userId ~= player.UserId or passId ~= VIP_PASS_ID or not purchased then return end
    TrackGamePass:FireServer(passId)
end)`

  const SIG_ECONOMY = `local tracker = Dashblox.createEconomyTracker(direction, currency, options?)
tracker(player, amount, payload?)`

  const EX_SHOP = `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

-- Create a reusable tracker for spending Coins
local spendCoins = Dashblox.createEconomyTracker("sink", "Coins")

-- Call it inside your purchase handler
spendCoins(player, 150, {
    itemId   = "speed_coil",
    itemName = "Speed Coil",
    shopId   = "main_shop",
})`

  const SIG_CONTEXT = `local ctx    = Dashblox.withContext(contextTable)
local track  = ctx.createEventTracker(eventName)
local spend  = ctx.createEconomyTracker(direction, currency, options?)`

  const EX_CONTEXT = `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

-- All events from this module carry { system = "pets" }
local PetCtx     = Dashblox.withContext({ system = "pets" })

local trackEquip = PetCtx.createEventTracker("pet_equipped")
local trackHatch = PetCtx.createEventTracker("egg_hatched")
local spendCoins = PetCtx.createEconomyTracker("sink", "Coins")

trackEquip(player, { petId = "dragon_fire" })
trackHatch(player, { eggId = "legendary_egg", rarity = "Epic" })
spendCoins(player, 500, { itemId = "speed_potion" })`

  const EX_CUSTOM_EVENT = `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

-- Track any meaningful action server-side
Dashblox.trackEvent(player, "quest_completed", {
    questId  = "starter_01",
    xpGained = 100,
})

Dashblox.trackEvent(player, "match_ended", {
    result   = "victory",
    duration = 180,
    kills    = 5,
})`

  const EX_QUEST = `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

-- Option A: plain trackEvent
Dashblox.trackEvent(player, "quest_step_completed", {
    questId  = "starter_01",
    step     = "collect_wood",
    progress = 3,
    goal     = 5,
})

-- Option B: withContext for a quest system module
local QuestCtx = Dashblox.withContext({ system = "quests" })
local trackStep = QuestCtx.createEventTracker("step_completed")
local trackDone = QuestCtx.createEventTracker("quest_completed")

trackStep(player, { questId = "starter_01", step = "collect_wood" })
trackDone(player, { questId = "starter_01", xpReward = 100 })`

  // ── curl examples ────────────────────────────────────────────────────────────
  const curl = {
    workspace: `curl ${BASE}/api/v1/workspace \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    workspaceMembers: `curl ${BASE}/api/v1/workspace/members \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    keysList: `curl ${BASE}/api/v1/keys \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    keysCreate: `curl -X POST ${BASE}/api/v1/keys \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Discord bot"}'`,

    keysDelete: `curl -X DELETE ${BASE}/api/v1/keys/KEY_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    gamesList: `curl ${BASE}/api/v1/games \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    gamesGet: `curl ${BASE}/api/v1/games/${GAME_ID} \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    health: `curl ${BASE}/api/v1/games/${GAME_ID}/health \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    live: `curl ${BASE}/api/v1/games/${GAME_ID}/live \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    liveServers: `curl "${BASE}/api/v1/games/${GAME_ID}/live/servers?limit=25" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    livePlayers: `curl "${BASE}/api/v1/games/${GAME_ID}/live/players?limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    playersList: `curl "${BASE}/api/v1/games/${GAME_ID}/players?search=PlayerName&online=true" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    playersGet: `curl ${BASE}/api/v1/games/${GAME_ID}/players/ROBLOX_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    playersSanctions: `curl ${BASE}/api/v1/games/${GAME_ID}/players/ROBLOX_ID/sanctions \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    playersNotesGet: `curl ${BASE}/api/v1/games/${GAME_ID}/players/ROBLOX_ID/notes \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    playersNotesPost: `curl -X POST ${BASE}/api/v1/games/${GAME_ID}/players/ROBLOX_ID/notes \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Suspicious behavior reported."}'`,

    sanctionsList: `curl "${BASE}/api/v1/games/${GAME_ID}/sanctions?active=true" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    sanctionsCreate: `curl -X POST ${BASE}/api/v1/games/${GAME_ID}/sanctions \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
  "robloxId": "123456789",
  "type": "ban",
  "reason": "Exploiting",
  "durationSeconds": 86400
}'`,

    sanctionsGet: `curl ${BASE}/api/v1/games/${GAME_ID}/sanctions/SANCTION_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    sanctionsDelete: `curl -X DELETE ${BASE}/api/v1/games/${GAME_ID}/sanctions/SANCTION_ID \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    logs: `curl "${BASE}/api/v1/games/${GAME_ID}/logs?event=player_join&limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    analyticsOverview: `curl "${BASE}/api/v1/games/${GAME_ID}/analytics/overview?range=7d" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    analyticsActivity: `curl "${BASE}/api/v1/games/${GAME_ID}/analytics/activity?range=30d" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    analyticsEconomy: `curl "${BASE}/api/v1/games/${GAME_ID}/analytics/economy?range=7d" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    analyticsMonetization: `curl "${BASE}/api/v1/games/${GAME_ID}/analytics/monetization?range=30d" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

    analyticsProgression: `curl "${BASE}/api/v1/games/${GAME_ID}/analytics/progression?range=7d" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex" style={{ minHeight: "100%" }}>

      {/* ── Left sticky nav ─────────────────────────────────────────────────── */}
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
          <DocsSidebar />
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-8 py-8" style={{ maxWidth: "820px" }}>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-semibold text-white">Developer Reference</h1>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "rgba(232,130,42,0.1)", color: "#e8822a", border: "1px solid rgba(232,130,42,0.2)" }}
            >
              {currentGame.name}
            </span>
          </div>
          <p className="text-sm" style={{ color: "#888" }}>
            Luau SDK and REST API docs for{" "}
            <span className="font-medium text-white">{currentGame.name}</span>.
            All curl examples include your game ID.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/guide"
              className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
              style={{ borderColor: "#2a2a2a", background: "#1e1e1e", color: "#ccc" }}
            >
              Installation guide →
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

        {/* ════════════════════════════════════════════════════════════════════
            SECTION — OVERVIEW
        ════════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Getting Started</Eyebrow>
          <H2 id="overview">Overview</H2>
          <Lead>
            Install one Roblox script once. Base tracking starts immediately. Add one
            function call per gameplay system when you want richer data. (See Advanced setup in Guide for custom events).
          </Lead>

          {/* 3-step cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-8">
            {[
              {
                n: "1",
                title: "Install",
                body: "Add the unified Dashblox script to ServerScriptService.",
                color: "#4ade80",
              },
              {
                n: "2",
                title: "Auto-tracking starts",
                body: "Joins, leaves, live servers, online players, and moderation sync automatically.",
                color: "#38bdf8",
              },
              {
                n: "3",
                title: "Add your events",
                body: "Call Dashblox from your server code for Robux purchases, shops, quests, and custom events.",
                color: "#e8822a",
              },
            ].map((step) => (
              <div
                key={step.n}
                className="rounded-xl p-4"
                style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: `${step.color}18`, color: step.color, border: `1px solid ${step.color}33` }}
                  >
                    {step.n}
                  </span>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "#888" }}>{step.body}</p>
              </div>
            ))}
          </div>

          {/* Auto vs manual */}
          <section className="mb-6">
            <H2 id="auto-tracking">Auto-tracking</H2>
            <Lead>These events are sent as soon as the files are installed — no extra code needed.</Lead>

            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              <div className="rounded-xl p-4" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#4ade80" }}>
                  Works automatically
                </p>
                <ul className="space-y-2">
                  {["player_join", "player_leave", "Live servers", "Online players", "Moderation sync"].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#4ade80" }} />
                      <code className="text-xs" style={{ color: "#d4d4d4" }}>{t}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl p-4" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: "#fbbf24" }}>
                  Needs one call in your code
                </p>
                <ul className="space-y-2">
                  {[
                    "Robux purchases",
                    "Soft-currency shop",
                    "Quest / progression",
                    "Rounds / matches",
                    "Custom UI events",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm" style={{ color: "#aaa" }}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#fbbf24" }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Callout type="info">
              Only <strong className="text-white">server scripts</strong> can call Dashblox. For
              LocalScript events (like button clicks), fire a RemoteEvent to the server first.
            </Callout>
          </section>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════════
            SECTION — LUA SDK
        ════════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Luau SDK</Eyebrow>

          {/* trackEvent */}
          <div className="mb-10">
            <H3 id="sdk-track-event" mono>trackEvent</H3>
            <P>Track any custom action. Use this for UI events, gameplay milestones, or anything product-specific.</P>
            <CodeBlock code={SIG_TRACK_EVENT} lang="signature" />
            <ParamsTable
              params={[
                { name: "player", type: "Player", required: true, description: "The Roblox player who performed the action." },
                { name: "eventName", type: "string", required: true, description: "A stable name like \"quest_completed\" or \"shop_opened\"." },
                { name: "payload", type: "table?", required: false, description: "Optional key/value pairs attached to the event." },
              ]}
            />
            <CodeBlock code={EX_TRACK_EVENT} />
          </div>

          {/* trackRobuxPurchase */}
          <div className="mb-10">
            <H3 id="sdk-robux" mono>trackRobuxPurchase</H3>
            <P>
              Track a Robux transaction. Call this <strong className="text-white">after</strong> the
              reward is granted — never before. The Robux amount must be the real price; it is not
              inferred automatically.
            </P>
            <CodeBlock code={SIG_TRACK_ROBUX} lang="signature" />
            <ParamsTable
              params={[
                { name: "player", type: "Player", required: true, description: "The purchasing player." },
                { name: "productType", type: '"developer_product" | "game_pass"', required: true, description: "The Roblox product type." },
                { name: "robuxAmount", type: "number", required: true, description: "Exact Robux price for this product." },
                { name: "payload", type: "table?", required: false, description: "Optional fields: productId, receiptId, productName, etc." },
              ]}
            />
            <P>See the <a href="#recipe-dev-product" className="underline" style={{ color: "#e8822a" }}>Developer product recipe</a> and the <a href="#recipe-game-pass" className="underline" style={{ color: "#e8822a" }}>Game pass recipe</a> for full examples.</P>
          </div>

          {/* createEconomyTracker */}
          <div className="mb-10">
            <H3 id="sdk-economy" mono>createEconomyTracker</H3>
            <P>Create a reusable tracker for in-game currency flows (Coins, Gems, etc.).</P>
            <CodeBlock code={SIG_ECONOMY} lang="signature" />
            <ParamsTable
              params={[
                { name: "direction", type: '"sink" | "source"', required: true, description: '"sink" = player spends currency. "source" = player earns currency.' },
                { name: "currency", type: "string", required: true, description: "Currency name, e.g. \"Coins\" or \"Gems\"." },
                { name: "options", type: "table?", required: false, description: "Optional context fields added to every event." },
              ]}
            />
            <P>See the <a href="#recipe-shop" className="underline" style={{ color: "#e8822a" }}>Soft-currency shop recipe</a>.</P>
          </div>

          {/* withContext */}
          <div className="mb-2">
            <H3 id="sdk-context" mono>withContext</H3>
            <P>
              Group events under a shared context (e.g. <code style={{ color: "#e8822a" }}>{"{ system: \"pets\" }"}</code>).
              Returns tracker factories that automatically include the context in every event.
            </P>
            <CodeBlock code={SIG_CONTEXT} lang="signature" />
            <ParamsTable
              params={[
                { name: "contextTable", type: "table", required: true, description: "Key/value pairs merged into every event payload, e.g. { system = \"pets\" }." },
              ]}
            />
            <CodeBlock code={EX_CONTEXT} />
            <Callout type="tip">
              One module per system is the recommended pattern — e.g.{" "}
              <code style={{ color: "#d4d4d4" }}>PetAnalytics</code>,{" "}
              <code style={{ color: "#d4d4d4" }}>ShopAnalytics</code>,{" "}
              <code style={{ color: "#d4d4d4" }}>QuestAnalytics</code>.
              Each wraps <code style={{ color: "#d4d4d4" }}>withContext</code> once at the top.
            </Callout>
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════════
            SECTION — RECIPES
        ════════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>Recipes</Eyebrow>
          <H2 id="recipes">Copy-paste recipes</H2>
          <Lead>Common patterns ready to drop into your game. Adjust names and IDs to match your systems.</Lead>

          {/* Custom event */}
          <div className="mb-10">
            <H3 id="recipe-custom">Custom event</H3>
            <P>Use for any server-side action: quest completed, match ended, item crafted, zone entered, etc.</P>
            <CodeBlock code={EX_CUSTOM_EVENT} />
          </div>

          {/* Developer product */}
          <div className="mb-10">
            <H3 id="recipe-dev-product">Developer product purchase</H3>
            <P>
              Call inside <code style={{ color: "#e8822a" }}>ProcessReceipt</code>, after the reward
              is actually granted. Replace <code style={{ color: "#7dd3fc" }}>99</code> with the real
              Robux price of your product.
            </P>
            <Callout type="warning">
              Only call <code style={{ color: "#d4d4d4" }}>trackRobuxPurchase</code> once you are
              about to return <code style={{ color: "#d4d4d4" }}>PurchaseGranted</code>. Never call
              it on a failed or pending receipt.
            </Callout>
            <CodeBlock code={EX_DEV_PRODUCT} />
          </div>

          {/* Game pass */}
          <div className="mb-10">
            <H3 id="recipe-game-pass">Game pass purchase</H3>
            <P>
              Detect the purchase in a LocalScript, then confirm ownership server-side before
              calling Dashblox. Replace <code style={{ color: "#7dd3fc" }}>249</code> with the
              real price and <code style={{ color: "#7dd3fc" }}>123456789</code> with your pass ID.
            </P>
            <CodeBlock code={EX_GAME_PASS} />
          </div>

          {/* Soft-currency shop */}
          <div className="mb-10">
            <H3 id="recipe-shop">Soft-currency shop purchase</H3>
            <P>Track Coins, Gems, or any other in-game currency spent in your shop.</P>
            <CodeBlock code={EX_SHOP} />
          </div>

          {/* Quest / Progression */}
          <div className="mb-2">
            <H3 id="recipe-quest">Quest / Progression</H3>
            <P>Use plain events or withContext. Context is useful when you want to filter all quest events together in Analytics.</P>
            <CodeBlock code={EX_QUEST} />
          </div>
        </section>

        <Divider />

        {/* ════════════════════════════════════════════════════════════════════
            SECTION — REST API
        ════════════════════════════════════════════════════════════════════ */}
        <section>
          <Eyebrow>REST API</Eyebrow>
          <H2 id="rest-api">REST API Reference</H2>
          <Lead>
            Available on the <span style={{ color: "#e8822a", fontWeight: 500 }}>Studio plan</span>.
            Authenticate every request with your API key from{" "}
            <Link href="/dashboard/settings" className="underline" style={{ color: "#e8822a" }}>
              Settings → API Keys
            </Link>.
          </Lead>

          {/* Authentication */}
          <div className="mb-10">
            <H3 id="api-auth">Authentication</H3>
            <P>Pass your API key in the <code style={{ color: "#d4d4d4" }}>Authorization</code> header of every request.</P>
            <CodeBlock code={`Authorization: Bearer YOUR_API_KEY`} lang="http" />
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { label: "Success", body: 'Returns { "data": { ... } } with HTTP 200 or 201.' },
                { label: "Error", body: 'Returns { "error": { "code": "...", "message": "..." } } with HTTP 4xx.' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-4 text-sm" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                  <p className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: "#555" }}>{item.label}</p>
                  <p style={{ color: "#aaa" }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace */}
          <div className="mb-8">
            <H3 id="api-workspace">Workspace</H3>
            <ApiEndpoint
              method="GET" path="/api/v1/workspace"
              description="Returns workspace name, slug, plan, and billing owner."
              curl={curl.workspace}
            />
            <ApiEndpoint
              method="GET" path="/api/v1/workspace/members"
              description="Returns all members in the workspace with their roles."
              curl={curl.workspaceMembers}
            />
          </div>

          {/* API Keys */}
          <div className="mb-8">
            <H3 id="api-keys">API Keys</H3>
            <ApiEndpoint
              method="GET" path="/api/v1/keys"
              description="List all active API keys for the workspace."
              curl={curl.keysList}
            />
            <ApiEndpoint
              method="POST" path="/api/v1/keys"
              description="Create a new API key. The full token is returned once — store it immediately."
              curl={curl.keysCreate}
              bodyParams={[{ name: "name", type: "string", required: true, description: "Display name for the key, e.g. \"Discord bot\"." }]}
            />
            <ApiEndpoint
              method="DELETE" path="/api/v1/keys/:keyId"
              description="Revoke an API key. It stops working immediately."
              curl={curl.keysDelete}
            />
          </div>

          {/* Games */}
          <div className="mb-8">
            <H3 id="api-games">Games</H3>
            <ApiEndpoint
              method="GET" path="/api/v1/games"
              description="List all games connected to the workspace."
              curl={curl.gamesList}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}`}
              description="Get full details for a game: name, slug, counts, webhook status."
              curl={curl.gamesGet}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/health`}
              description="Health status: live servers, recent event rate, pending/failed moderation."
              curl={curl.health}
            />
          </div>

          {/* Live */}
          <div className="mb-8">
            <H3 id="api-live">Live</H3>
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/live`}
              description="Full live snapshot: health score, active servers, and online players in one call."
              curl={curl.live}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/live/servers`}
              description="Paginated list of active servers with player counts."
              curl={curl.liveServers}
              queryParams={[
                { name: "page", type: "number", description: "Page number, default 1." },
                { name: "limit", type: "number", description: "Results per page, max 100." },
              ]}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/live/players`}
              description="Paginated list of currently online players."
              curl={curl.livePlayers}
              queryParams={[
                { name: "page", type: "number", description: "Page number, default 1." },
                { name: "limit", type: "number", description: "Results per page, max 100." },
              ]}
            />
          </div>

          {/* Players */}
          <div className="mb-8">
            <H3 id="api-players">Players</H3>
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/players`}
              description="Paginated tracked players. Supports search by username or Roblox ID, and filtering by online status."
              curl={curl.playersList}
              queryParams={[
                { name: "search", type: "string", description: "Search by username or Roblox ID." },
                { name: "online", type: "boolean", description: "Pass true to return only online players." },
                { name: "page", type: "number", description: "Page number." },
                { name: "limit", type: "number", description: "Results per page, max 100." },
              ]}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/players/:robloxId`}
              description="Full player profile: join count, last seen, play time, and active sanctions."
              curl={curl.playersGet}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/players/:robloxId/sanctions`}
              description="All sanctions for a specific player (active and past)."
              curl={curl.playersSanctions}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/players/:robloxId/notes`}
              description="List moderation notes on a player."
              curl={curl.playersNotesGet}
            />
            <ApiEndpoint
              method="POST" path={`/api/v1/games/${GAME_ID}/players/:robloxId/notes`}
              description="Add a moderation note to a player."
              curl={curl.playersNotesPost}
              bodyParams={[
                { name: "text", type: "string", required: true, description: "The note content." },
              ]}
            />
          </div>

          {/* Sanctions */}
          <div className="mb-8">
            <H3 id="api-sanctions">Sanctions</H3>
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/sanctions`}
              description="Paginated list of sanctions. Filter by active status or player."
              curl={curl.sanctionsList}
              queryParams={[
                { name: "active", type: "boolean", description: "Pass true for active-only sanctions." },
                { name: "robloxId", type: "string", description: "Filter to a single player." },
                { name: "page", type: "number", description: "Page number." },
                { name: "limit", type: "number", description: "Results per page, max 100." },
              ]}
            />
            <ApiEndpoint
              method="POST" path={`/api/v1/games/${GAME_ID}/sanctions`}
              description="Create a ban or kick. Omit durationSeconds for a permanent ban."
              curl={curl.sanctionsCreate}
              bodyParams={[
                { name: "robloxId", type: "string", required: true, description: "Target player's Roblox user ID." },
                { name: "type", type: '"ban" | "kick"', required: true, description: "Sanction type." },
                { name: "reason", type: "string", required: true, description: "Reason shown in the dashboard and logs." },
                { name: "durationSeconds", type: "number?", required: false, description: "Duration in seconds. Omit for permanent." },
              ]}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/sanctions/:sanctionId`}
              description="Get a specific sanction by ID."
              curl={curl.sanctionsGet}
            />
            <ApiEndpoint
              method="DELETE" path={`/api/v1/games/${GAME_ID}/sanctions/:sanctionId`}
              description="Revoke (lift) a sanction. The player can rejoin immediately."
              curl={curl.sanctionsDelete}
            />
          </div>

          {/* Logs */}
          <div className="mb-8">
            <H3 id="api-logs">Logs</H3>
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/logs`}
              description="Paginated event log. Filter by event type, player, or date range."
              curl={curl.logs}
              queryParams={[
                { name: "event", type: "string", description: "Event name filter, e.g. player_join." },
                { name: "robloxId", type: "string", description: "Filter to a single player." },
                { name: "from", type: "ISO date", description: "Start of date range." },
                { name: "to", type: "ISO date", description: "End of date range." },
                { name: "page", type: "number", description: "Page number." },
                { name: "limit", type: "number", description: "Results per page, max 100." },
              ]}
            />
          </div>

          {/* Analytics */}
          <div className="mb-8">
            <H3 id="api-analytics">Analytics</H3>
            <Callout type="info">
              All analytics endpoints accept <code style={{ color: "#d4d4d4" }}>range</code> (
              <code style={{ color: "#7dd3fc" }}>7d</code>,{" "}
              <code style={{ color: "#7dd3fc" }}>14d</code>,{" "}
              <code style={{ color: "#7dd3fc" }}>30d</code>,{" "}
              <code style={{ color: "#7dd3fc" }}>90d</code>) or custom{" "}
              <code style={{ color: "#d4d4d4" }}>from</code> /{" "}
              <code style={{ color: "#d4d4d4" }}>to</code> ISO dates.
            </Callout>
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/analytics/overview`}
              description="High-level stats: unique players, sessions, total playtime, top events. Includes period-over-period deltas."
              curl={curl.analyticsOverview}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/analytics/activity`}
              description="Time-bucketed activity: hourly, daily, or weekly player and event counts."
              curl={curl.analyticsActivity}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/analytics/economy`}
              description="Economy flows grouped by currency: total sinks and sources per currency."
              curl={curl.analyticsEconomy}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/analytics/monetization`}
              description="Monetization by product: transactions, unique buyers, gross revenue, average order value."
              curl={curl.analyticsMonetization}
            />
            <ApiEndpoint
              method="GET" path={`/api/v1/games/${GAME_ID}/analytics/progression`}
              description="Progression funnel: completions and unique players per step, sorted by volume."
              curl={curl.analyticsProgression}
            />
          </div>

          {/* Footer note */}
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}
          >
            <span className="font-medium text-white">No API key yet?</span>{" "}
            <span style={{ color: "#888" }}>
              Go to{" "}
              <Link href="/dashboard/settings" className="underline" style={{ color: "#e8822a" }}>
                Settings
              </Link>{" "}
              and create one under <strong className="text-white">API Keys</strong>. Studio plan required.
            </span>
          </div>
        </section>

        {/* bottom padding */}
        <div className="h-16" />
      </div>
    </div>
  )
}
