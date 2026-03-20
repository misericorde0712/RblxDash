/**
 * Dashboard API — Live Config CRUD
 *
 * GET    /api/games/[gameId]/config         → list all configs
 * POST   /api/games/[gameId]/config         → create a config entry
 * PUT    /api/games/[gameId]/config         → update a config entry (by key)
 * DELETE /api/games/[gameId]/config?key=xxx → delete a config entry
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireCurrentOrg } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import { publishMessagingServiceMessage } from "@/lib/roblox-open-cloud"

const VALUE_TYPES = ["string", "number", "boolean", "json"] as const

const CreateConfigSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_.]*$/, "Key must be alphanumeric with dots/underscores"),
  value: z.string(),
  valueType: z.enum(VALUE_TYPES).default("string"),
  group: z.string().max(64).default("default"),
  description: z.string().max(500).optional(),
})

const UpdateConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string().optional(),
  valueType: z.enum(VALUE_TYPES).optional(),
  group: z.string().max(64).optional(),
  description: z.string().max(500).optional().nullable(),
})

async function resolveGameForOrg(gameId: string) {
  const { org, member } = await requireCurrentOrg()

  if (member.role === "MODERATOR") {
    return NextResponse.json(
      { error: "Insufficient permissions — Admin or Owner required" },
      { status: 403 }
    )
  }

  const game = await prisma.game.findFirst({
    where: { id: gameId, orgId: org.id },
    select: { id: true, orgId: true, robloxUniverseId: true, robloxConnection: { select: { userId: true, scopes: true } } },
  })

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  return { game, org, member }
}

async function notifyConfigChanged(game: { robloxUniverseId: string | null; robloxConnection: { userId: string; scopes: string[] } | null }, memberId: string) {
  if (!game.robloxUniverseId || !game.robloxConnection) {
    console.log("[LiveConfig] Skip notify: no universeId or connection", { universeId: game.robloxUniverseId, hasConnection: !!game.robloxConnection })
    return
  }
  if (!game.robloxConnection.scopes.includes("universe-messaging-service:publish")) {
    console.log("[LiveConfig] Skip notify: missing messaging scope", { scopes: game.robloxConnection.scopes })
    return
  }

  try {
    const tokenResult = await ensureRobloxAccessToken(game.robloxConnection.userId)
    if (!tokenResult) {
      console.log("[LiveConfig] Skip notify: no access token")
      return
    }
    await publishMessagingServiceMessage(
      tokenResult.accessToken,
      game.robloxUniverseId,
      "RblxDash_LiveConfig",
      JSON.stringify({ action: "refresh" })
    )
    console.log("[LiveConfig] MessagingService published to universe", game.robloxUniverseId)
  } catch (err) {
    console.error("[LiveConfig] MessagingService publish failed:", err)
  }
}

function validateValue(value: string, valueType: string): string | null {
  if (valueType === "number" && isNaN(Number(value))) {
    return "Value must be a valid number"
  }
  if (valueType === "boolean" && value !== "true" && value !== "false") {
    return "Value must be 'true' or 'false'"
  }
  if (valueType === "json") {
    try {
      JSON.parse(value)
    } catch {
      return "Value must be valid JSON"
    }
  }
  return null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const result = await resolveGameForOrg(gameId)
    if (result instanceof NextResponse) return result

    const configs = await prisma.liveConfig.findMany({
      where: { gameId },
      orderBy: [{ group: "asc" }, { key: "asc" }],
    })

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { configVersion: true },
    })

    return NextResponse.json({
      data: configs,
      version: game?.configVersion ?? 0,
    })
  } catch (err) {
    console.error("[GET /api/games/[gameId]/config]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const result = await resolveGameForOrg(gameId)
    if (result instanceof NextResponse) return result

    const body = await req.json()
    const parsed = CreateConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      )
    }

    const { key, value, valueType, group, description } = parsed.data

    const validationError = validateValue(value, valueType)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Check for duplicate key
    const existing = await prisma.liveConfig.findUnique({
      where: { gameId_key: { gameId, key } },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Config key "${key}" already exists. Use PUT to update.` },
        { status: 409 }
      )
    }

    const [config] = await prisma.$transaction([
      prisma.liveConfig.create({
        data: {
          gameId,
          key,
          value,
          valueType,
          group,
          description,
          updatedBy: result.member.userId,
        },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { configVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          event: "config.created",
          targetType: "LiveConfig",
          targetId: key,
          payload: { key, value, valueType, group },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

    notifyConfigChanged(result.game, result.member.userId)
    return NextResponse.json({ data: config }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/games/[gameId]/config]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const result = await resolveGameForOrg(gameId)
    if (result instanceof NextResponse) return result

    const body = await req.json()
    const parsed = UpdateConfigSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      )
    }

    const { key, value, valueType, group, description } = parsed.data

    const existing = await prisma.liveConfig.findUnique({
      where: { gameId_key: { gameId, key } },
    })

    if (!existing) {
      return NextResponse.json({ error: `Config key "${key}" not found` }, { status: 404 })
    }

    const newValueType = valueType ?? existing.valueType

    if (value !== undefined) {
      const validationError = validateValue(value, newValueType)
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = { updatedBy: result.member.userId }
    if (value !== undefined) updateData.value = value
    if (valueType !== undefined) updateData.valueType = valueType
    if (group !== undefined) updateData.group = group
    if (description !== undefined) updateData.description = description

    const [config] = await prisma.$transaction([
      prisma.liveConfig.update({
        where: { gameId_key: { gameId, key } },
        data: updateData,
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { configVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          event: "config.updated",
          targetType: "LiveConfig",
          targetId: key,
          payload: { key, ...updateData },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

    notifyConfigChanged(result.game, result.member.userId)
    return NextResponse.json({ data: config })
  } catch (err) {
    console.error("[PUT /api/games/[gameId]/config]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const result = await resolveGameForOrg(gameId)
    if (result instanceof NextResponse) return result

    const key = req.nextUrl.searchParams.get("key")

    if (!key) {
      return NextResponse.json({ error: "Missing 'key' query parameter" }, { status: 400 })
    }

    const existing = await prisma.liveConfig.findUnique({
      where: { gameId_key: { gameId, key } },
    })

    if (!existing) {
      return NextResponse.json({ error: `Config key "${key}" not found` }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.liveConfig.delete({
        where: { gameId_key: { gameId, key } },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { configVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          event: "config.deleted",
          targetType: "LiveConfig",
          targetId: key,
          payload: { key, previousValue: existing.value, previousType: existing.valueType },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

    notifyConfigChanged(result.game, result.member.userId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/games/[gameId]/config]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
