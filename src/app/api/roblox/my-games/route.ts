import { NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type RobloxGame = {
  id: number
  rootPlaceId: number
  name: string
  placeVisits: number
}

export async function GET() {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) return currentOrgResult.response

    const { dbUser } = currentOrgResult.context

    const robloxConnection = await prisma.robloxConnection.findUnique({
      where: { userId: dbUser.id },
      select: { robloxUserId: true },
    })

    if (!robloxConnection) {
      return NextResponse.json({ games: [] })
    }

    const res = await fetch(
      `https://games.roblox.com/v2/users/${robloxConnection.robloxUserId}/games?sortOrder=Desc&limit=50`,
      { next: { revalidate: 60 } }
    )

    if (!res.ok) {
      return NextResponse.json({ games: [] })
    }

    const data = (await res.json()) as { data?: RobloxGame[] }
    const games = (data.data ?? []).map((g) => ({
      universeId: String(g.id),
      placeId: String(g.rootPlaceId),
      name: g.name,
      placeVisits: g.placeVisits ?? 0,
    }))

    return NextResponse.json({ games })
  } catch (err) {
    console.error("[GET /api/roblox/my-games]", err)
    return NextResponse.json({ games: [] })
  }
}
