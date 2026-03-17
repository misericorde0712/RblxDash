"use client"

import { useState } from "react"
import CopyButton from "../copy-button"
import {
  buildCustomRobloxModuleScript,
  getSuggestedSystemName,
  type CustomModuleTrackerDefinition,
  type CustomTrackerKind,
  type EconomyFlowType,
} from "@/lib/roblox-custom-module"

type BuilderTracker = CustomModuleTrackerDefinition & {
  id: string
}

function createTracker(
  overrides?: Partial<BuilderTracker>
): BuilderTracker {
  return {
    id: Math.random().toString(36).slice(2, 10),
    functionName: "roundFinished",
    trackerKind: "event",
    actionName: "round_finished",
    flowType: "sink",
    currency: "Coins",
    entryName: "shop_purchase",
    ...overrides,
  }
}

function createRobuxPurchaseTracker(): BuilderTracker {
  return createTracker({
    functionName: "robuxPurchaseCompleted",
    trackerKind: "economy",
    actionName: "robux_purchase_completed",
    flowType: "sink",
    currency: "Robux",
    entryName: "robux_purchase",
  })
}

function buildDefaultModuleName(gameName: string) {
  const cleaned = gameName.replace(/[^a-zA-Z0-9]+/g, " ").trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return "GameAnalytics"
  }

  return `${parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")}Analytics`
}

function getKindLabel(kind: CustomTrackerKind) {
  if (kind === "economy") {
    return "Economy"
  }

  if (kind === "progression") {
    return "Progression"
  }

  return "Event"
}

export default function CustomModuleBuilder({
  gameName,
}: {
  gameName: string
}) {
  const [moduleName, setModuleName] = useState(buildDefaultModuleName(gameName))
  const [systemName, setSystemName] = useState(
    getSuggestedSystemName(buildDefaultModuleName(gameName))
  )
  const [trackers, setTrackers] = useState<BuilderTracker[]>([
    createTracker(),
    createTracker({
      id: "starter-economy",
      functionName: "purchaseCompleted",
      trackerKind: "economy",
      actionName: "purchase_completed",
      flowType: "sink",
      currency: "Coins",
      entryName: "shop_purchase",
    }),
  ])

  const generatedCode = buildCustomRobloxModuleScript({
    moduleName,
    systemName,
    trackers,
  })

  function updateTracker(
    trackerId: string,
    patch: Partial<BuilderTracker>
  ) {
    setTrackers((currentTrackers) =>
      currentTrackers.map((tracker) =>
        tracker.id === trackerId ? { ...tracker, ...patch } : tracker
      )
    )
  }

  function addTracker(kind: CustomTrackerKind) {
    setTrackers((currentTrackers) => [
      ...currentTrackers,
      createTracker(
        kind === "economy"
          ? {
              trackerKind: "economy",
              functionName: "purchaseCompleted",
              actionName: "purchase_completed",
              flowType: "sink",
              currency: "Coins",
              entryName: "shop_purchase",
            }
          : kind === "progression"
            ? {
                trackerKind: "progression",
                functionName: "questCompleted",
                actionName: "quest_completed",
              }
            : {
                trackerKind: "event",
                functionName: "roundFinished",
                actionName: "round_finished",
              }
      ),
    ])
  }

  function removeTracker(trackerId: string) {
    setTrackers((currentTrackers) =>
      currentTrackers.filter((tracker) => tracker.id !== trackerId)
    )
  }

  function addRobuxPurchaseTracker() {
    setTrackers((currentTrackers) => [
      ...currentTrackers,
      createRobuxPurchaseTracker(),
    ])
  }

  function updateTrackerKind(trackerId: string, trackerKind: CustomTrackerKind) {
    setTrackers((currentTrackers) =>
      currentTrackers.map((tracker) => {
        if (tracker.id !== trackerId) {
          return tracker
        }

        if (trackerKind === "economy") {
          return {
            ...tracker,
            trackerKind,
            flowType: tracker.flowType ?? "sink",
            currency: tracker.currency ?? "Coins",
            entryName: tracker.entryName ?? tracker.actionName,
          }
        }

        return {
          ...tracker,
          trackerKind,
        }
      })
    )
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Custom module builder
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Fill a few fields and get a ModuleScript ready to paste into Roblox
            Studio. No need to write the code by hand.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
              Module name
            </span>
            <input
              type="text"
              value={moduleName}
              onChange={(event) => setModuleName(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
              placeholder="PetAnalytics"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-gray-500">
              System tag
            </span>
            <input
              type="text"
              value={systemName}
              onChange={(event) => setSystemName(event.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
              placeholder="pets"
            />
          </label>
        </div>

        <div className="rounded-xl border border-cyan-900 bg-cyan-950/50 px-4 py-3 text-sm text-cyan-100">
          Simple example: module <strong>PetAnalytics</strong>, system tag{" "}
          <strong>pets</strong>, then add functions like{" "}
          <strong>petEquipped</strong>, <strong>petSold</strong>, or{" "}
          <strong>petLevelUp</strong>.
        </div>

        <div className="rounded-xl border border-yellow-900 bg-yellow-950/50 px-4 py-3 text-sm text-yellow-100">
          For a Robux purchase, use the <strong>Add Robux purchase</strong>{" "}
          preset. It already prepares the tracker with{" "}
          <strong>currency = Robux</strong> and{" "}
          <strong>entry = robux_purchase</strong>.
        </div>

        <div className="space-y-3">
          {trackers.map((tracker, index) => (
            <div
              key={tracker.id}
              className="rounded-xl border border-gray-800 bg-gray-950/70 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">
                  Function {index + 1} · {getKindLabel(tracker.trackerKind)}
                </p>
                {trackers.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeTracker(tracker.id)}
                    className="rounded-lg border border-red-900 bg-red-950 px-2.5 py-1.5 text-xs text-red-200 transition hover:bg-red-900"
                  >
                    Remove
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Function name
                  </span>
                  <input
                    type="text"
                    value={tracker.functionName}
                    onChange={(event) =>
                      updateTracker(tracker.id, {
                        functionName: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
                    placeholder="petEquipped"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Tracker type
                  </span>
                  <select
                    value={tracker.trackerKind}
                    onChange={(event) =>
                      updateTrackerKind(
                        tracker.id,
                        event.target.value as CustomTrackerKind
                      )
                    }
                    className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
                  >
                    <option value="event">Event</option>
                    <option value="progression">Progression</option>
                    <option value="economy">Economy</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                    Event name
                  </span>
                  <input
                    type="text"
                    value={tracker.actionName}
                    onChange={(event) =>
                      updateTracker(tracker.id, {
                        actionName: event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
                    placeholder="pet_equipped"
                  />
                </label>

                {tracker.trackerKind === "economy" ? (
                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                      Flow
                    </span>
                    <select
                      value={tracker.flowType}
                      onChange={(event) =>
                        updateTracker(tracker.id, {
                          flowType: event.target.value as EconomyFlowType,
                        })
                      }
                      className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
                    >
                      <option value="sink">sink</option>
                      <option value="source">source</option>
                    </select>
                  </label>
                ) : (
                  <div />
                )}
              </div>

              {tracker.trackerKind === "economy" ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                      Currency
                    </span>
                    <input
                      type="text"
                      value={tracker.currency}
                      onChange={(event) =>
                        updateTracker(tracker.id, {
                          currency: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
                      placeholder="Coins"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-xs uppercase tracking-wider text-gray-500">
                      Entry tag
                    </span>
                    <input
                      type="text"
                      value={tracker.entryName}
                      onChange={(event) =>
                        updateTracker(tracker.id, {
                          entryName: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-700 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-700"
                      placeholder="shop_purchase"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addTracker("event")}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 transition hover:bg-gray-800"
          >
            Add event
          </button>
          <button
            type="button"
            onClick={() => addTracker("progression")}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 transition hover:bg-gray-800"
          >
            Add progression
          </button>
          <button
            type="button"
            onClick={() => addTracker("economy")}
            className="rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-300 transition hover:bg-gray-800"
          >
            Add economy
          </button>
          <button
            type="button"
            onClick={addRobuxPurchaseTracker}
            className="rounded-lg border border-yellow-800 bg-yellow-950 px-3 py-2 text-xs text-yellow-100 transition hover:bg-yellow-900"
          >
            Add Robux purchase
          </button>
        </div>

        <div className="rounded-xl border border-green-900 bg-green-950/50 px-4 py-3 text-sm text-green-100">
          Result: create a <strong>ModuleScript</strong> in{" "}
          <strong>ServerScriptService</strong>, name it{" "}
          <strong>{moduleName || "CustomAnalytics"}</strong>, then paste the
          generated code.
        </div>

        <div className="flex flex-wrap gap-2">
          <CopyButton
            value={generatedCode}
            idleLabel="Copy generated module"
            copiedLabel="Generated module copied"
          />
        </div>

        <details className="rounded-xl border border-gray-800 bg-gray-950/70">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-gray-200">
            Show generated module
          </summary>
          <div className="border-t border-gray-800 px-4 py-4">
            <pre className="overflow-x-auto rounded-lg border border-gray-800 bg-black/20 px-3 py-2 text-xs text-gray-100">
              {generatedCode}
            </pre>
          </div>
        </details>
      </div>
    </section>
  )
}
