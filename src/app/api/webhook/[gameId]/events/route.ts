/**
 * GET /api/webhook/[gameId]/events
 *
 * Endpoint pour le Luau SDK — retourne les événements actifs d'un jeu.
 * Auth: x-webhook-secret header (même que les webhooks).
 *
 * Supporte ETag via le champ game.eventVersion pour du polling efficace.
 * Si le client envoie If-None-Match avec la même version → 304 Not Modified.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    const events = await prisma.liveEvent.findMany({
      where: {
        gameId,
        active: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gt: now } },
        ],
      },
      select: {
        slug: true,
        name: true,
        description: true,
        eventData: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { startsAt: "asc" },
    })

    // Transform events for Luau consumption
    const formattedEvents = events.map((event) => {
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
        startsAt: event.startsAt.toISOString(),
        endsAt: event.endsAt?.toISOString() ?? null,
      }
    })

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
