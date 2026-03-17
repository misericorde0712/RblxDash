"use client"

import Link from "next/link"
import { startTransition, useState } from "react"
import type { ChangeEvent } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { OrgRole } from "@prisma/client"
import { formatOrgRole } from "@/lib/org-members"

type GameOption = {
  id: string
  name: string
  orgName: string
  orgSlug: string
  role: OrgRole
}

function getRedirectPath(pathname: string, nextGameId: string) {
  if (!pathname.startsWith("/dashboard")) {
    return "/dashboard"
  }

  if (pathname === "/dashboard/games/new") {
    return "/dashboard/games"
  }

  if (pathname.startsWith("/dashboard/games/")) {
    return `/dashboard/games/${nextGameId}`
  }

  return pathname
}

function getGamesByWorkspace(games: GameOption[]) {
  const groupedGames = new Map<
    string,
    {
      label: string
      games: GameOption[]
    }
  >()

  for (const game of games) {
    const existingGroup = groupedGames.get(game.orgSlug) ?? {
      label: game.orgName,
      games: [],
    }
    existingGroup.games.push(game)
    groupedGames.set(game.orgSlug, existingGroup)
  }

  return Array.from(groupedGames.entries())
}

export default function GameSwitcher({
  games,
  currentGameId,
  currentOrgName,
}: {
  games: GameOption[]
  currentGameId: string | null
  currentOrgName: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedGameId, setSelectedGameId] = useState(currentGameId ?? "")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentGame =
    games.find((game) => game.id === selectedGameId) ??
    games.find((game) => game.id === currentGameId) ??
    null

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextGameId = event.target.value

    if (!nextGameId) {
      return
    }

    const previousGameId = selectedGameId
    const redirectTo = getRedirectPath(pathname, nextGameId)

    setSelectedGameId(nextGameId)
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch("/api/games/current", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameId: nextGameId,
          redirectTo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSelectedGameId(previousGameId)
        setError(data.error ?? "Unable to switch game")
        return
      }

      startTransition(() => {
        router.replace(data.redirectTo ?? redirectTo)
        router.refresh()
      })
    } catch {
      setSelectedGameId(previousGameId)
      setError("Unable to switch game")
    } finally {
      setIsSaving(false)
    }
  }

  if (games.length === 0) {
    return (
      <div>
        <label htmlFor="current-game" className="rd-label mb-1.5 block">
          Active game
        </label>
        <div
          className="rounded-lg border border-dashed px-3 py-2 text-sm"
          style={{ borderColor: "#3a3a3a", background: "#1d1d1d", color: "#9ca3af" }}
        >
          No games yet
        </div>
        <p className="mt-2 text-xs" style={{ color: "#666666" }}>{currentOrgName}</p>
        <Link
          href="/dashboard/games"
          className="rd-link-accent mt-2 inline-flex text-xs font-semibold"
        >
          Open games library
        </Link>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="current-game" className="rd-label mb-1.5 block">
        Active game
      </label>
      <select
        id="current-game"
        value={selectedGameId}
        onChange={handleChange}
        disabled={isSaving}
        className="rd-input w-full disabled:cursor-not-allowed disabled:opacity-70"
      >
        {!currentGameId ? (
          <option value="">Select a game</option>
        ) : null}
        {getGamesByWorkspace(games).map(([workspaceSlug, workspaceGroup]) => (
          <optgroup key={workspaceSlug} label={workspaceGroup.label}>
            {workspaceGroup.games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {currentGame ? (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs" style={{ color: "#666666" }}>
          <span className="truncate">{currentGame.orgName}</span>
          <span>{formatOrgRole(currentGame.role)}</span>
        </div>
      ) : (
        <p className="mt-2 text-xs" style={{ color: "#666666" }}>
          {currentOrgName} / Pick a game to switch context.
        </p>
      )}

      {error ? (
        <p className="mt-2 text-xs" style={{ color: "#f87171" }}>{error}</p>
      ) : null}
    </div>
  )
}
