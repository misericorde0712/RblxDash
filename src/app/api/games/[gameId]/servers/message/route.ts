import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { z } from "zod"
import { getCurrentOrgForApi } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import { ensureRobloxAccessToken } from "@/lib/roblox-connection"
import { publishMessagingServiceMessage } from "@/lib/roblox-open-cloud"

const ServerCommandSchema = z
  .object({
    command: z.enum(["shutdown", "broadcast", "kick"]),
    jobId: z.string().optional(),
    message: z.string().max(500).optional(),
    robloxId: z.string().optional(),
    reason: z.string().max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.command === "broadcast" && !value.message?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["message"],
        message: "A message is required for broadcast",
      })
    }
    if (value.command === "kick" && !value.robloxId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["robloxId"],
        message: "A player Roblox ID is required for kick",
      })
    }
  })

const MESSAGING_TOPIC = "RblxDash"
const MESSAGING_SCOPE = "universe-messaging-service:publish"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { gameId } = await params
    const { dbUser, org } = currentOrgResult.context

    const body = await req.json()
    const parsed = ServerCommandSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const game = await prisma.game.findFirst({
      where: { id: gameId, orgId: org.id },
      select: {
        id: true,
        name: true,
        robloxUniverseId: true,
        robloxConnection: { select: { userId: true, scopes: true } },
      },
    })

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 })
    }

    if (!game.robloxUniverseId) {
      return NextResponse.json(
        { error: "This game has no Universe ID configured." },
        { status: 409 }
      )
    }

    // Get OAuth token
    const connectionUserId = game.robloxConnection?.userId ?? dbUser.id
    const tokenResult = await ensureRobloxAccessToken(connectionUserId).catch(
      () => null
    )

    if (!tokenResult) {
      return NextResponse.json(
        {
          error:
            "No Roblox account connected. Connect your Roblox account from the Account page to enable server management.",
        },
        { status: 409 }
      )
    }

    if (!tokenResult.connection.scopes.includes(MESSAGING_SCOPE)) {
      return NextResponse.json(
        {
          error: `Missing Roblox scope "${MESSAGING_SCOPE}". Please reconnect your Roblox account from the Account page to grant this permission.`,
        },
        { status: 409 }
      )
    }

    // Build the command payload for the Luau script
    const { command, jobId, message, robloxId, reason } = parsed.data
    const commandPayload = JSON.stringify({
      command,
      jobId: jobId ?? "",
      payload: {
        ...(message ? { message } : {}),
        ...(robloxId ? { robloxId } : {}),
        ...(reason ? { reason: reason } : { reason: "Action from dashboard" }),
      },
    })

    // Roblox MessagingService has a 1KB message limit
    if (Buffer.byteLength(commandPayload, "utf-8") > 1024) {
      return NextResponse.json(
        { error: "Command payload exceeds the 1KB MessagingService limit." },
        { status: 400 }
      )
    }

    await publishMessagingServiceMessage(
      tokenResult.accessToken,
      game.robloxUniverseId,
      MESSAGING_TOPIC,
      commandPayload
    )

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "server.command_sent",
      targetType: "server",
      targetId: jobId ?? "all",
      payload: {
        gameId: game.id,
        gameName: game.name,
        command,
        jobId: jobId ?? null,
        message: message ?? null,
        robloxId: robloxId ?? null,
        reason: reason ?? null,
      },
    })

    return NextResponse.json({ ok: true, command })
  } catch (err) {
    if (
      err instanceof Error &&
      err.message.includes("MessagingService publish failed")
    ) {
      const is429 = err.message.includes("(429)")
      return NextResponse.json(
        {
          error: is429
            ? "Rate limited by Roblox. Please wait a moment before sending another command."
            : `Roblox API error: ${err.message}`,
        },
        { status: is429 ? 429 : 502 }
      )
    }

    console.error("[POST /api/games/[gameId]/servers/message]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
