import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess } from "@/lib/api-auth"

// GET /api/v1/workspace/members
export async function GET(req: NextRequest) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const members = await prisma.orgMember.findMany({
    where: { orgId: auth.org.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { joinedAt: "asc" },
  })

  return apiSuccess(
    members.map((m) => ({
      id: m.id,
      role: m.role,
      joined_at: m.joinedAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
      },
    }))
  )
}
