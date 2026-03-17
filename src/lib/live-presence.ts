import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type PrismaClientLike = Prisma.TransactionClient | typeof prisma
type JsonRecord = Record<string, unknown>

export const LIVE_SERVER_STALE_AFTER_SECONDS = 90

function getPayloadString(payload: JsonRecord, key: string) {
  const value = payload[key]
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null
}

function getPayloadNumber(payload: JsonRecord, key: string) {
  const value = payload[key]

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function getPayloadStringArray(payload: JsonRecord, key: string) {
  const value = payload[key]

  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function getLiveServerCutoff(referenceDate: Date = new Date()) {
  return new Date(
    referenceDate.getTime() - LIVE_SERVER_STALE_AFTER_SECONDS * 1000
  )
}

export function isLiveServer(
  server: Pick<{ lastHeartbeatAt: Date }, "lastHeartbeatAt">,
  referenceDate: Date = new Date()
) {
  return server.lastHeartbeatAt.getTime() >= getLiveServerCutoff(referenceDate).getTime()
}

export function getServerPresenceFromPayload(payload: JsonRecord) {
  const hasPlayerCount = Object.prototype.hasOwnProperty.call(payload, "playerCount")
  const hasPlayerIds = Object.prototype.hasOwnProperty.call(payload, "playerIds")

  return {
    jobId: getPayloadString(payload, "jobId"),
    placeId: getPayloadString(payload, "placeId"),
    region: getPayloadString(payload, "region"),
    playerCount: hasPlayerCount
      ? Math.max(0, getPayloadNumber(payload, "playerCount") ?? 0)
      : null,
    playerIds: hasPlayerIds ? getPayloadStringArray(payload, "playerIds") : null,
  }
}

export async function cleanupStaleLivePresence(
  client: PrismaClientLike,
  params: {
    gameId?: string
    referenceDate?: Date
  } = {}
) {
  const referenceDate = params.referenceDate ?? new Date()
  const staleServers = await client.liveServer.findMany({
    where: {
      ...(params.gameId ? { gameId: params.gameId } : {}),
      lastHeartbeatAt: {
        lt: getLiveServerCutoff(referenceDate),
      },
    },
    select: {
      gameId: true,
      jobId: true,
    },
  })

  if (staleServers.length === 0) {
    return { staleServerCount: 0, clearedPlayerCount: 0 }
  }

  const staleJobIdsByGame = new Map<string, string[]>()
  for (const server of staleServers) {
    const existing = staleJobIdsByGame.get(server.gameId)
    if (existing) {
      existing.push(server.jobId)
    } else {
      staleJobIdsByGame.set(server.gameId, [server.jobId])
    }
  }

  let clearedPlayerCount = 0

  for (const [gameId, jobIds] of staleJobIdsByGame.entries()) {
    const result = await client.trackedPlayer.updateMany({
      where: {
        gameId,
        currentServerJobId: {
          in: jobIds,
        },
        isOnline: true,
      },
      data: {
        isOnline: false,
        currentServerJobId: null,
        lastSessionEndedAt: referenceDate,
      },
    })

    clearedPlayerCount += result.count
  }

  return {
    staleServerCount: staleServers.length,
    clearedPlayerCount,
  }
}
