import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"

// GET /api/v1/games/:gameId/players/:robloxId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; robloxId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId, robloxId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const player = await prisma.trackedPlayer.findUnique({
    where: { gameId_robloxId: { gameId, robloxId } },
    include: {
      _count: { select: { sanctions: true, notes: true } },
    },
  })

  if (!player) return apiError("NOT_FOUND", "Player not found.", 404)

  return apiSuccess({
    roblox_id: player.robloxId,
    username: player.username,
    display_name: player.displayName,
    is_online: player.isOnline,
    server_job_id: player.currentServerJobId,
    first_seen_at: player.firstSeenAt,
    last_seen_at: player.lastSeenAt,
    last_session_started_at: player.lastSessionStartedAt,
    last_session_ended_at: player.lastSessionEndedAt,
    sanctions_count: player._count.sanctions,
    notes_count: player._count.notes,
  })
}
