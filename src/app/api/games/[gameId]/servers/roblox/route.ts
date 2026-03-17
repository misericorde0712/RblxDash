import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { getLiveServerCutoff } from "@/lib/live-presence"
import { prisma } from "@/lib/prisma"
import {
  fetchAllPublicServers,
  fetchPlayerThumbnails,
} from "@/lib/roblox-servers"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { gameId } = await params
    const { org } = currentOrgResult.context

    const game = await prisma.game.findFirst({
      where: { id: gameId, orgId: org.id },
      select: { robloxUniverseId: true },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (!game.robloxUniverseId) {
      return NextResponse.json(
        { error: "This game has no Universe ID configured. Set it in game settings to enable Roblox server data." },
        { status: 409 }
      )
    }

    const liveCutoff = getLiveServerCutoff()

    const [robloxServers, liveServers] = await Promise.all([
      fetchAllPublicServers(game.robloxUniverseId),
      prisma.liveServer.findMany({
        where: { gameId, lastHeartbeatAt: { gte: liveCutoff } },
      }),
    ])

    const liveServerMap = new Map(
      liveServers.map((s) => [s.jobId, s])
    )

    // Collect all player IDs for thumbnail fetching
    const allPlayerIds = new Set<string>()
    for (const ls of liveServers) {
      for (const pid of ls.lastPlayerIds) {
        allPlayerIds.add(pid)
      }
    }

    const thumbnails = await fetchPlayerThumbnails([...allPlayerIds])
    const thumbnailsObj: Record<string, string> = {}
    for (const [id, url] of thumbnails) {
      thumbnailsObj[id] = url
    }

    const enrichedServers = robloxServers.map((rs) => {
      const ls = liveServerMap.get(rs.id)
      return {
        jobId: rs.id,
        maxPlayers: rs.maxPlayers,
        playing: rs.playing,
        fps: Math.round(rs.fps * 10) / 10,
        ping: Math.round(rs.ping),
        // From our webhook data (if available)
        region: ls?.region ?? null,
        startedAt: ls?.startedAt?.toISOString() ?? null,
        lastHeartbeatAt: ls?.lastHeartbeatAt?.toISOString() ?? null,
        lastPlayerIds: ls?.lastPlayerIds ?? [],
        hasWebhookData: Boolean(ls),
      }
    })

    // Include servers from webhooks that Roblox public API doesn't show
    const robloxJobIds = new Set(robloxServers.map((s) => s.id))
    for (const ls of liveServers) {
      if (!robloxJobIds.has(ls.jobId)) {
        enrichedServers.push({
          jobId: ls.jobId,
          maxPlayers: 0,
          playing: ls.lastPlayerCount,
          fps: 0,
          ping: 0,
          region: ls.region,
          startedAt: ls.startedAt.toISOString(),
          lastHeartbeatAt: ls.lastHeartbeatAt.toISOString(),
          lastPlayerIds: ls.lastPlayerIds,
          hasWebhookData: true,
        })
      }
    }

    return NextResponse.json({
      servers: enrichedServers,
      thumbnails: thumbnailsObj,
    })
  } catch (err) {
    console.error("[GET /api/games/[gameId]/servers/roblox]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
