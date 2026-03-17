/**
 * GET /api/webhook/[gameId]/config
 *
 * Endpoint pour le Luau SDK — retourne toutes les configs d'un jeu.
 * Auth: x-webhook-secret header (même que les webhooks).
 *
 * Supporte ETag via le champ game.configVersion pour du polling efficace.
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
        configVersion: true,
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
    const etag = `"v${game.configVersion}"`
    const ifNoneMatch = req.headers.get("if-none-match")

    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag },
      })
    }

    const configs = await prisma.liveConfig.findMany({
      where: { gameId },
      select: {
        key: true,
        value: true,
        valueType: true,
        group: true,
      },
      orderBy: { key: "asc" },
    })

    // Transformer en objet clé-valeur avec les valeurs parsées
    const configMap: Record<string, unknown> = {}
    const configByGroup: Record<string, Record<string, unknown>> = {}

    for (const config of configs) {
      let parsedValue: unknown = config.value
      try {
        if (config.valueType === "number") {
          parsedValue = Number(config.value)
        } else if (config.valueType === "boolean") {
          parsedValue = config.value === "true"
        } else if (config.valueType === "json") {
          parsedValue = JSON.parse(config.value)
        }
      } catch {
        // Keep as string if parsing fails
      }

      configMap[config.key] = parsedValue

      if (!configByGroup[config.group]) {
        configByGroup[config.group] = {}
      }
      configByGroup[config.group][config.key] = parsedValue
    }

    return NextResponse.json(
      {
        version: game.configVersion,
        config: configMap,
        groups: configByGroup,
      },
      {
        headers: {
          ETag: etag,
          "Cache-Control": "no-cache",
        },
      }
    )
  } catch (err) {
    console.error("[GET /api/webhook/[gameId]/config]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
