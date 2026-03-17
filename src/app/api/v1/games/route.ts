import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess } from "@/lib/api-auth"

// GET /api/v1/games
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const games = await prisma.game.findMany({
    where: { orgId: auth.org.id },
    select: {
      id: true,
      name: true,
      robloxPlaceId: true,
      robloxUniverseId: true,
      modules: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return apiSuccess(games)
}
