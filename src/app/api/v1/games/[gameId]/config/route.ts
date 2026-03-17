/**
 * API v1 — Live Config (Studio plan required)
 *
 * GET  /api/v1/games/[gameId]/config         → list all configs
 * POST /api/v1/games/[gameId]/config         → create or update a config
 * DELETE /api/v1/games/[gameId]/config?key=x → delete a config
 */

import { NextRequest } from "next/server"
import { z } from "zod"
import {
  authenticateApiRequest,
  resolveGame,
  apiError,
  apiSuccess,
} from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const UpsertConfigSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/),
  value: z.string(),
  valueType: z.enum(["string", "number", "boolean", "json"]).default("string"),
  group: z.string().max(64).default("default"),
  description: z.string().max(500).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof Response) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (game instanceof Response) return game

  const configs = await prisma.liveConfig.findMany({
    where: { gameId },
    select: {
      key: true,
      value: true,
      valueType: true,
      group: true,
      description: true,
      updatedAt: true,
    },
    orderBy: [{ group: "asc" }, { key: "asc" }],
  })

  const gameRecord = await prisma.game.findUnique({
    where: { id: gameId },
    select: { configVersion: true },
  })

  return apiSuccess(configs, { version: gameRecord?.configVersion ?? 0 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof Response) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (game instanceof Response) return game

  const body = await req.json()
  const parsed = UpsertConfigSchema.safeParse(body)

  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid body", 400)
  }

  const { key, value, valueType, group, description } = parsed.data

  // Validate value matches type
  if (valueType === "number" && isNaN(Number(value))) {
    return apiError("VALIDATION_ERROR", "Value must be a valid number", 400)
  }
  if (valueType === "boolean" && value !== "true" && value !== "false") {
    return apiError("VALIDATION_ERROR", "Value must be 'true' or 'false'", 400)
  }
  if (valueType === "json") {
    try {
      JSON.parse(value)
    } catch {
      return apiError("VALIDATION_ERROR", "Value must be valid JSON", 400)
    }
  }

  const [config] = await prisma.$transaction([
    prisma.liveConfig.upsert({
      where: { gameId_key: { gameId, key } },
      create: {
        gameId,
        key,
        value,
        valueType,
        group,
        description,
      },
      update: {
        value,
        valueType,
        group,
        description,
      },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: { configVersion: { increment: 1 } },
    }),
  ])

  return apiSuccess(config)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof Response) return auth

  const { gameId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (game instanceof Response) return game

  const key = req.nextUrl.searchParams.get("key")
  if (!key) {
    return apiError("VALIDATION_ERROR", "Missing 'key' query parameter", 400)
  }

  const existing = await prisma.liveConfig.findUnique({
    where: { gameId_key: { gameId, key } },
  })

  if (!existing) {
    return apiError("NOT_FOUND", `Config key "${key}" not found`, 404)
  }

  await prisma.$transaction([
    prisma.liveConfig.delete({
      where: { gameId_key: { gameId, key } },
    }),
    prisma.game.update({
      where: { id: gameId },
      data: { configVersion: { increment: 1 } },
    }),
  ])

  return apiSuccess({ deleted: true })
}
