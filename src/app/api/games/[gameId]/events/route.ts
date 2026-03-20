/**
 * Dashboard API — Live Events CRUD
 *
 * GET    /api/games/[gameId]/events              → list all events
 * POST   /api/games/[gameId]/events              → create an event
 * PUT    /api/games/[gameId]/events              → update an event (by id)
 * DELETE /api/games/[gameId]/events?id=xxx       → delete an event
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireCurrentOrg } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import { publishMessagingServiceMessage } from "@/lib/roblox-open-cloud"

const RecurrenceTypeEnum = z.enum(["ONCE", "ALWAYS", "HOURLY", "DAILY", "WEEKLY", "MONTHLY"])

const CreateEventSchema = z
  .object({
    name: z.string().min(1).max(128),
    slug: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens"),
    description: z.string().max(500).optional(),
    eventData: z.string().default("{}"),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    active: z.boolean().default(true),
    recurrenceType: RecurrenceTypeEnum.default("ONCE"),
    recurrenceInterval: z.number().int().min(1).default(1),
    recurrenceDaysOfWeek: z.array(z.number().int().min(0).max(6)).default([]),
    recurrenceDayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
    duration: z.number().int().min(1).optional().nullable(),
    recurrenceTimeOfDay: z
      .string()
      .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
      .optional()
      .nullable(),
    timezone: z.string().default("UTC"),
  })
  .superRefine((data, ctx) => {
    if (data.recurrenceType === "ONCE" && !data.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "startsAt is required for ONCE events",
        path: ["startsAt"],
      })
    }
    if (data.recurrenceType === "WEEKLY" && data.recurrenceDaysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "recurrenceDaysOfWeek must not be empty for WEEKLY events",
        path: ["recurrenceDaysOfWeek"],
      })
    }
    if (data.recurrenceType === "MONTHLY" && data.recurrenceDayOfMonth == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "recurrenceDayOfMonth is required for MONTHLY events",
        path: ["recurrenceDayOfMonth"],
      })
    }
    if (
      ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"].includes(data.recurrenceType) &&
      data.duration == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "duration is required for recurring events",
        path: ["duration"],
      })
    }
  })

const UpdateEventSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(128).optional(),
  slug: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(500).optional().nullable(),
  eventData: z.string().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
  recurrenceType: RecurrenceTypeEnum.optional(),
  recurrenceInterval: z.number().int().min(1).optional(),
  recurrenceDaysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  recurrenceDayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  duration: z.number().int().min(1).optional().nullable(),
  recurrenceTimeOfDay: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .optional()
    .nullable(),
  timezone: z.string().optional(),
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
    select: {
      id: true,
      orgId: true,
      robloxUniverseId: true,
      robloxConnection: { select: { userId: true, scopes: true } },
    },
  })

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  return { game, org, member }
}

async function notifyEventsChanged(
  game: {
    robloxUniverseId: string | null
    robloxConnection: { userId: string; scopes: string[] } | null
  },
) {
  if (!game.robloxUniverseId || !game.robloxConnection) return
  if (!game.robloxConnection.scopes.includes("universe-messaging-service:publish")) return

  try {
    const tokenResult = await ensureRobloxAccessToken(game.robloxConnection.userId)
    if (!tokenResult) return
    await publishMessagingServiceMessage(
      tokenResult.accessToken,
      game.robloxUniverseId,
      "RblxDash_LiveEvents",
      JSON.stringify({ action: "refresh" })
    )
    console.log("[LiveEvents] MessagingService published to universe", game.robloxUniverseId)
  } catch (err) {
    console.error("[LiveEvents] MessagingService publish failed:", err)
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params
    const result = await resolveGameForOrg(gameId)
    if (result instanceof NextResponse) return result

    const events = await prisma.liveEvent.findMany({
      where: { gameId },
      orderBy: [{ updatedAt: "desc" }],
    })

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { eventVersion: true },
    })

    return NextResponse.json({
      data: events,
      version: game?.eventVersion ?? 0,
    })
  } catch (err) {
    console.error("[GET /api/games/[gameId]/events]", err)
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
    const parsed = CreateEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      )
    }

    const {
      name, slug, description, eventData, startsAt, endsAt, active,
      recurrenceType, recurrenceInterval, recurrenceDaysOfWeek,
      recurrenceDayOfMonth, duration, recurrenceTimeOfDay, timezone,
    } = parsed.data

    // Validate eventData is valid JSON
    try {
      JSON.parse(eventData)
    } catch {
      return NextResponse.json({ error: "eventData must be valid JSON" }, { status: 400 })
    }

    // Check for duplicate slug
    const existing = await prisma.liveEvent.findUnique({
      where: { gameId_slug: { gameId, slug } },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Event slug "${slug}" already exists.` },
        { status: 409 }
      )
    }

    const [event] = await prisma.$transaction([
      prisma.liveEvent.create({
        data: {
          gameId,
          name,
          slug,
          description,
          eventData,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          active,
          recurrenceType,
          recurrenceInterval,
          recurrenceDaysOfWeek,
          recurrenceDayOfMonth,
          duration,
          recurrenceTimeOfDay,
          timezone,
          updatedBy: result.member.userId,
        },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { eventVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          event: "event.created",
          targetType: "LiveEvent",
          targetId: slug,
          payload: { name, slug, startsAt, endsAt, active, recurrenceType },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

    notifyEventsChanged(result.game)
    return NextResponse.json({ data: event }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/games/[gameId]/events]", err)
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
    const parsed = UpdateEventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body" },
        { status: 400 }
      )
    }

    const {
      id, name, slug, description, eventData, startsAt, endsAt, active,
      recurrenceType, recurrenceInterval, recurrenceDaysOfWeek,
      recurrenceDayOfMonth, duration, recurrenceTimeOfDay, timezone,
    } = parsed.data

    const existing = await prisma.liveEvent.findFirst({
      where: { id, gameId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // If slug is changing, check for duplicate
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.liveEvent.findUnique({
        where: { gameId_slug: { gameId, slug } },
      })
      if (slugExists) {
        return NextResponse.json(
          { error: `Event slug "${slug}" already exists.` },
          { status: 409 }
        )
      }
    }

    if (eventData) {
      try {
        JSON.parse(eventData)
      } catch {
        return NextResponse.json({ error: "eventData must be valid JSON" }, { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = { updatedBy: result.member.userId }
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug
    if (description !== undefined) updateData.description = description
    if (eventData !== undefined) updateData.eventData = eventData
    if (startsAt !== undefined) updateData.startsAt = startsAt ? new Date(startsAt) : null
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null
    if (active !== undefined) updateData.active = active
    if (recurrenceType !== undefined) updateData.recurrenceType = recurrenceType
    if (recurrenceInterval !== undefined) updateData.recurrenceInterval = recurrenceInterval
    if (recurrenceDaysOfWeek !== undefined) updateData.recurrenceDaysOfWeek = recurrenceDaysOfWeek
    if (recurrenceDayOfMonth !== undefined) updateData.recurrenceDayOfMonth = recurrenceDayOfMonth
    if (duration !== undefined) updateData.duration = duration
    if (recurrenceTimeOfDay !== undefined) updateData.recurrenceTimeOfDay = recurrenceTimeOfDay
    if (timezone !== undefined) updateData.timezone = timezone

    const [event] = await prisma.$transaction([
      prisma.liveEvent.update({
        where: { id },
        data: updateData,
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { eventVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          event: "event.updated",
          targetType: "LiveEvent",
          targetId: existing.slug,
          payload: { id, ...updateData },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

    notifyEventsChanged(result.game)
    return NextResponse.json({ data: event })
  } catch (err) {
    console.error("[PUT /api/games/[gameId]/events]", err)
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

    const id = req.nextUrl.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Missing 'id' query parameter" }, { status: 400 })
    }

    const existing = await prisma.liveEvent.findFirst({
      where: { id, gameId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.liveEvent.delete({
        where: { id },
      }),
      prisma.game.update({
        where: { id: gameId },
        data: { eventVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          event: "event.deleted",
          targetType: "LiveEvent",
          targetId: existing.slug,
          payload: { slug: existing.slug, name: existing.name },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

    notifyEventsChanged(result.game)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/games/[gameId]/events]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
