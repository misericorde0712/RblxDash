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

const CreateEventSchema = z.object({
  name: z.string().min(1).max(128),
  slug: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Slug must be lowercase alphanumeric with hyphens"),
  description: z.string().max(500).optional(),
  eventData: z.string().default("{}"),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  active: z.boolean().default(true),
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
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
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
    select: { id: true, orgId: true },
  })

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  return { game, org, member }
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
      orderBy: [{ startsAt: "desc" }],
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

    const { name, slug, description, eventData, startsAt, endsAt, active } = parsed.data

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
          startsAt: new Date(startsAt),
          endsAt: endsAt ? new Date(endsAt) : null,
          active,
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
          payload: { name, slug, startsAt, endsAt, active },
          actorUserId: result.member.userId,
          orgId: result.org.id,
        },
      }),
    ])

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

    const { id, name, slug, description, eventData, startsAt, endsAt, active } = parsed.data

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
    if (startsAt !== undefined) updateData.startsAt = new Date(startsAt)
    if (endsAt !== undefined) updateData.endsAt = endsAt ? new Date(endsAt) : null
    if (active !== undefined) updateData.active = active

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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/games/[gameId]/events]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
