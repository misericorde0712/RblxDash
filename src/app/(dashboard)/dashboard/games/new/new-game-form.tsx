"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import type { ModuleId } from "@/types"

const ALL_MODULES: { id: ModuleId; label: string; description: string }[] = [
  { id: "players", label: "Players", description: "Track player activity" },
  { id: "moderation", label: "Moderation", description: "Bans, kicks, timeouts" },
  { id: "logs", label: "Logs", description: "Game event log feed" },
  { id: "analytics", label: "Analytics", description: "Daily stats and charts" },
  { id: "economy", label: "Economy", description: "Revenue and spend tracking" },
]

const STEP_COPY = [
  {
    title: "Name your game",
    description: "Pick the dashboard name and enter the Roblox Place ID.",
  },
  {
    title: "Add Roblox access",
    description: "Use a linked Roblox account or paste an Open Cloud API key.",
  },
  {
    title: "Choose modules",
    description: "Turn on the parts of Dashblox you want to use first.",
  },
] as const

function getStepStatus(
  index: number,
  activeStep: number,
  completedSteps: boolean[]
) {
  if (completedSteps[index]) {
    return "Done"
  }

  if (index === activeStep) {
    return "Current"
  }

  return "Next"
}

export default function NewGameForm({
  allowedModules,
  canSubmit,
  blockingMessage,
  robloxConnection,
}: {
  allowedModules: ModuleId[]
  canSubmit: boolean
  blockingMessage?: string | null
  robloxConnection?: {
    robloxUserId: string
    robloxUsername: string | null
    robloxDisplayName: string | null
    scopes: string[]
  } | null
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [robloxPlaceId, setRobloxPlaceId] = useState("")
  const [robloxUniverseId, setRobloxUniverseId] = useState("")
  const [openCloudApiKey, setOpenCloudApiKey] = useState("")
  const [modules, setModules] = useState<ModuleId[]>(["players", "logs"])
  const [activeStep, setActiveStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requiresOpenCloudKey = !robloxConnection

  // Auto-fill Universe ID and game name when a valid Place ID is entered
  useEffect(() => {
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current)
    const trimmed = robloxPlaceId.trim()
    if (!trimmed || !/^\d{6,}$/.test(trimmed)) return

    lookupTimeout.current = setTimeout(async () => {
      setLookupLoading(true)
      try {
        const res = await fetch(
          `/api/roblox/universe/lookup?placeId=${encodeURIComponent(trimmed)}`
        )
        if (!res.ok) return
        const data = (await res.json()) as {
          universeId?: string
          name?: string | null
        }
        if (data.universeId && !robloxUniverseId) {
          setRobloxUniverseId(data.universeId)
        }
        if (data.name && !name.trim()) {
          setName(data.name)
        }
      } catch {
        // silently ignore — user can fill manually
      } finally {
        setLookupLoading(false)
      }
    }, 600)

    return () => {
      if (lookupTimeout.current) clearTimeout(lookupTimeout.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [robloxPlaceId])

  const identityReady = name.trim().length > 0 && robloxPlaceId.trim().length > 0
  const accessReady = Boolean(robloxConnection || openCloudApiKey.trim())
  const modulesReady = modules.length > 0
  const completedSteps = [identityReady, accessReady, modulesReady]

  const selectedModulesLabel = useMemo(
    () =>
      modules
        .map((id) => ALL_MODULES.find((moduleOption) => moduleOption.id === id)?.label ?? id)
        .join(", "),
    [modules]
  )

  function toggleModule(id: ModuleId) {
    if (!allowedModules.includes(id)) {
      return
    }

    setModules((prev) =>
      prev.includes(id) ? prev.filter((moduleId) => moduleId !== id) : [...prev, id]
    )
  }

  function validateStep(stepIndex: number) {
    if (stepIndex === 0 && !identityReady) {
      setError("Add a game name and a Roblox Place ID before continuing.")
      return false
    }

    if (stepIndex === 1 && !accessReady) {
      setError("Paste an Open Cloud API key or connect a Roblox account first.")
      return false
    }

    if (stepIndex === 2 && !modulesReady) {
      setError("Select at least one module before creating the game.")
      return false
    }

    return true
  }

  function handleStepChange(nextStep: number) {
    if (nextStep <= activeStep) {
      setError(null)
      setActiveStep(nextStep)
      return
    }

    for (let stepIndex = 0; stepIndex < nextStep; stepIndex += 1) {
      if (!validateStep(stepIndex)) {
        setActiveStep(stepIndex)
        return
      }
    }

    setError(null)
    setActiveStep(nextStep)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!canSubmit) {
      setError(blockingMessage ?? "You cannot create a game right now.")
      return
    }

    if (!validateStep(0)) {
      setActiveStep(0)
      return
    }

    if (!validateStep(1)) {
      setActiveStep(1)
      return
    }

    if (!validateStep(2)) {
      setActiveStep(2)
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          robloxPlaceId,
          robloxUniverseId,
          openCloudApiKey,
          modules,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to create game.")
        return
      }

      router.push(`/dashboard/games/${data.game.id}?setup=1`)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-[1.75rem] border border-gray-800 bg-gray-900/90 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
    >
      <div className="grid gap-3 md:grid-cols-3">
        {STEP_COPY.map((step, index) => {
          const isCurrent = index === activeStep
          const isDone = completedSteps[index]
          const canOpen =
            index <= activeStep ||
            completedSteps.slice(0, index).every(Boolean)

          return (
            <button
              key={step.title}
              type="button"
              onClick={() => handleStepChange(index)}
              disabled={!canOpen || loading}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                isCurrent
                  ? "border-indigo-500 bg-indigo-500/10"
                  : isDone
                    ? "border-emerald-800 bg-emerald-950/30"
                    : "border-gray-800 bg-black/20 hover:border-gray-700"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-white">
                  {index + 1}. {step.title}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] ${
                    isCurrent
                      ? "bg-indigo-500/20 text-indigo-200"
                      : isDone
                        ? "bg-emerald-500/20 text-emerald-200"
                        : "bg-white/5 text-gray-500"
                  }`}
                >
                  {getStepStatus(index, activeStep, completedSteps)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {step.description}
              </p>
            </button>
          )
        })}
      </div>

      {activeStep === 0 ? (
        <section className="rounded-2xl border border-gray-800 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Step 1
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Basic game details
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Use the Roblox place you want to monitor. The game name is only used
            inside Dashblox and can be changed later.
          </p>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Game name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Food Truck Game"
                disabled={!canSubmit || loading}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Roblox Place ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={robloxPlaceId}
                  onChange={(e) => setRobloxPlaceId(e.target.value)}
                  placeholder="123456789"
                  disabled={!canSubmit || loading}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
                {lookupLoading ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-400">
                    Looking up...
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Game name and Universe ID will auto-fill if you have a linked Roblox account.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Roblox Universe ID
                <span className="ml-2 text-xs font-normal text-gray-500">
                  Optional
                </span>
              </label>
              <input
                type="text"
                value={robloxUniverseId}
                onChange={(e) => setRobloxUniverseId(e.target.value)}
                placeholder="Useful for future publishing and Roblox auth flows"
                disabled={!canSubmit || loading}
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </div>
        </section>
      ) : null}

      {activeStep === 1 ? (
        <section className="rounded-2xl border border-gray-800 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Step 2
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Roblox access for manual setup
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            The main production path is still manual setup: paste an Open Cloud
            key, keep your Place ID, then install the Dashblox files into the
            game after creation.
          </p>

          {robloxConnection ? (
            <div className="mt-5 rounded-2xl border border-blue-900 bg-blue-950/40 px-4 py-4 text-sm text-blue-100">
              <p>
                Linked Roblox account:{" "}
                <span className="font-medium text-white">
                  {robloxConnection.robloxDisplayName ||
                    robloxConnection.robloxUsername ||
                    robloxConnection.robloxUserId}
                </span>
              </p>
              <p className="mt-2 text-xs text-blue-100/80">
                You can leave the Open Cloud key empty for now. Dashblox will
                still work with webhook-based installation, and the linked
                account is stored for future authenticated Roblox flows.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-cyan-900 bg-cyan-950/30 px-4 py-4 text-sm text-cyan-100">
              <p className="font-medium text-white">What you need here</p>
              <p className="mt-2 leading-6 text-cyan-100/80">
                Create an Open Cloud API key for the same Roblox universe, then
                paste it below. This is the recommended setup path while Roblox
                OAuth remains private.
              </p>
            </div>
          )}

          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Open Cloud API Key
              {!requiresOpenCloudKey ? (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  Optional
                </span>
              ) : null}
            </label>
            <input
              type="password"
              required={requiresOpenCloudKey}
              value={openCloudApiKey}
              onChange={(e) => setOpenCloudApiKey(e.target.value)}
              placeholder="Roblox Open Cloud key"
              disabled={!canSubmit || loading}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="mt-1 text-xs text-gray-500">
              {requiresOpenCloudKey
                ? "Required right now because no Roblox account is linked on this Dashblox account."
                : "Optional fallback. Keep it empty if you only want the webhook-based installation flow for now."}
            </p>
          </div>
        </section>
      ) : null}

      {activeStep === 2 ? (
        <section className="rounded-2xl border border-gray-800 bg-black/20 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            Step 3
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Choose your modules and create the game
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Start with the modules you really need. You can return later and
            expand the setup once the game is connected.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Modules
              </label>
              <div className="space-y-2">
                {ALL_MODULES.map((mod) => {
                  const isAllowed = allowedModules.includes(mod.id)

                  return (
                    <label
                      key={mod.id}
                      className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${
                        isAllowed
                          ? "cursor-pointer border-gray-700 bg-gray-800 hover:border-gray-600"
                          : "cursor-not-allowed border-gray-800 bg-gray-950/70 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={modules.includes(mod.id)}
                        onChange={() => toggleModule(mod.id)}
                        disabled={!isAllowed || !canSubmit || loading}
                        className="mt-0.5 accent-indigo-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{mod.label}</p>
                        <p className="text-xs text-gray-400">
                          {mod.description}
                          {!isAllowed ? " / Requires a higher plan" : ""}
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-950/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
                Ready to create
              </p>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Game
                  </p>
                  <p className="mt-1 text-white">{name || "Game name missing"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Place ID
                  </p>
                  <p className="mt-1 text-white">
                    {robloxPlaceId || "Place ID missing"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Access mode
                  </p>
                  <p className="mt-1 text-white">
                    {robloxConnection && !openCloudApiKey.trim()
                      ? "Linked Roblox account"
                      : openCloudApiKey.trim()
                        ? "Open Cloud API key"
                        : "Access missing"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Modules
                  </p>
                  <p className="mt-1 text-white">
                    {selectedModulesLabel || "No modules selected"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-gray-500">
                After creation, Dashblox will take you straight to the game hub
                so you can install the files and run the setup validator.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-800 bg-red-950 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 pt-4">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => (activeStep === 0 ? router.back() : handleStepChange(activeStep - 1))}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-800"
          >
            {activeStep === 0 ? "Cancel" : "Back"}
          </button>

          {activeStep < STEP_COPY.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(activeStep)) {
                  setError(null)
                  setActiveStep(activeStep + 1)
                }
              }}
              disabled={!canSubmit || loading}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          ) : null}
        </div>

        {activeStep === STEP_COPY.length - 1 ? (
          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create game and open setup"}
          </button>
        ) : null}
      </div>
    </form>
  )
}
