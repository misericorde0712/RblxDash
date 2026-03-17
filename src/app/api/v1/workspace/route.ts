import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess } from "@/lib/api-auth"

// GET /api/v1/workspace
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const [gamesCount, membersCount] = await Promise.all([
    prisma.game.count({ where: { orgId: auth.org.id } }),
    prisma.orgMember.count({ where: { orgId: auth.org.id } }),
  ])

  return apiSuccess({
    id: auth.org.id,
    name: auth.org.name,
    slug: auth.org.slug,
    games_count: gamesCount,
    members_count: membersCount,
    created_at: auth.org.createdAt,
  })
}
