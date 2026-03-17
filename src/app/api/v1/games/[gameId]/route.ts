import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"

// GET /api/v1/games/:gameId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const [playersCount, sanctionsCount] = await Promise.all([
    prisma.trackedPlayer.count({ where: { gameId } }),
    prisma.sanction.count({ where: { gameId, active: true } }),
  ])

  return apiSuccess({
    id: game.id,
    name: game.name,
    roblox_place_id: game.robloxPlaceId,
    roblox_universe_id: game.robloxUniverseId,
    modules: game.modules,
    tracked_players: playersCount,
    active_sanctions: sanctionsCount,
    created_at: game.createdAt,
  })
}
