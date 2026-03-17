import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame, getPagination } from "@/lib/api-auth"

// GET /api/v1/games/:gameId/players
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const sp = req.nextUrl.searchParams
  const { page, limit, skip } = getPagination(sp)
  const search = sp.get("search")?.trim() ?? null
  const onlineOnly = sp.get("online") === "true"

  const where = {
    gameId,
    ...(onlineOnly ? { isOnline: true } : {}),
    ...(search
      ? {
          OR: [
            { username: { contains: search, mode: "insensitive" as const } },
            { displayName: { contains: search, mode: "insensitive" as const } },
            { robloxId: { contains: search } },
          ],
        }
      : {}),
  }

  const [players, total] = await Promise.all([
    prisma.trackedPlayer.findMany({
      where,
      select: {
        robloxId: true,
        username: true,
        displayName: true,
        isOnline: true,
        currentServerJobId: true,
        firstSeenAt: true,
        lastSeenAt: true,
        _count: { select: { sanctions: true, notes: true } },
      },
      orderBy: { lastSeenAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.trackedPlayer.count({ where }),
  ])

  return apiSuccess(
    players.map((p) => ({
      roblox_id: p.robloxId,
      username: p.username,
      display_name: p.displayName,
      is_online: p.isOnline,
      server_job_id: p.currentServerJobId,
      first_seen_at: p.firstSeenAt,
      last_seen_at: p.lastSeenAt,
      sanctions_count: p._count.sanctions,
      notes_count: p._count.notes,
    })),
    { page, limit, total, has_more: skip + players.length < total }
  )
}
