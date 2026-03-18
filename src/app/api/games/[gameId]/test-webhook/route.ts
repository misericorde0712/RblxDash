import { NextRequest, NextResponse } from "next/server"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const ctx = await getCurrentOrgForApi()
    if ("response" in ctx) return ctx.response

    const { gameId } = await params

    const game = await prisma.game.findFirst({
      where: { id: gameId, orgId: ctx.context.org.id },
      select: { id: true, webhookSecret: true },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL!
    const webhookUrl = `${appUrl}/api/webhook/${gameId}`

    const testPayload = {
      event: "player_join",
      payload: {
        jobId: `test-server-${Date.now()}`,
        placeId: "test",
        playerCount: 1,
      },
      robloxId: "000000000",
      username: "TestPlayer",
      displayName: "Test Player",
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": game.webhookSecret,
      },
      body: JSON.stringify(testPayload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error("[test-webhook] Échec:", body)
      return NextResponse.json({ error: "Webhook returned an error" }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[POST /api/games/[gameId]/test-webhook]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
