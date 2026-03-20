/**
 * GET /api/webhook/[gameId]/events
 *
 * Endpoint pour le Luau SDK — retourne les evenements actifs d'un jeu.
 * Auth: x-webhook-secret header (meme que les webhooks).
 *
 * Supporte ETag via le champ game.eventVersion pour du polling efficace.
 * Si le client envoie If-None-Match avec la meme version → 304 Not Modified.
 *
 * Recurrence: fetches all active events, then filters using isEventCurrentlyActive.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isEventCurrentlyActive } from "@/lib/recurrence"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        webhookSecret: true,
        eventVersion: true,
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const incomingSecret = req.headers.get("x-webhook-secret")
    if (!incomingSecret || incomingSecret !== game.webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ETag-based caching
    const etag = `"v${game.eventVersion}"`
    const ifNoneMatch = req.headers.get("if-none-match")

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag },
      })
    }

    const now = new Date()

    // Fetch all active events with global window pre-filter
    const events = await prisma.liveEvent.findMany({
      where: {
        gameId,
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: {
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
      },
      select: {
        slug: true,
        name: true,
        description: true,
        eventData: true,
        startsAt: true,
        endsAt: true,
        active: true,
        recurrenceType: true,
        recurrenceInterval: true,
        recurrenceDaysOfWeek: true,
        recurrenceDayOfMonth: true,
        duration: true,
        recurrenceTimeOfDay: true,
        timezone: true,
      },
      orderBy: { updatedAt: "desc" },
    })

    // Filter by recurrence logic
    const formattedEvents = events
      .map((event) => {
        const result = isEventCurrentlyActive(event, now)
        if (!result.isActive) return null

        let data: unknown = {}
        try {
          data = JSON.parse(event.eventData)
        } catch {
          // Keep as empty object if parsing fails
        }

        return {
          slug: event.slug,
          name: event.name,
          description: event.description,
          data,
          startsAt: event.startsAt?.toISOString() ?? null,
          endsAt: event.endsAt?.toISOString() ?? null,
          recurrenceType: event.recurrenceType,
          occurrenceStart: result.occurrenceStart?.toISOString() ?? null,
          occurrenceEnd: result.occurrenceEnd?.toISOString() ?? null,
        }
      })
      .filter(Boolean)

    return NextResponse.json(
      {
        version: game.eventVersion,
        events: formattedEvents,
      },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "no-cache",
        },
      }
    )
  } catch (err) {
    console.error("[GET /api/webhook/[gameId]/events]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
