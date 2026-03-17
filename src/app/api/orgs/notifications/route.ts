import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const UpdateNotificationsSchema = z.object({
  discordWebhookUrl: z.string().url("Invalid URL").or(z.literal("")).nullable(),
})

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await getCurrentOrgForApi()
    if ("response" in ctx) return ctx.response

    const { member, org } = ctx.context

    // Seul l'owner ou admin peut modifier les notifications
    if (member.role === "MODERATOR") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = UpdateNotificationsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { discordWebhookUrl } = parsed.data

    await prisma.organization.update({
      where: { id: org.id },
      data: { discordWebhookUrl: discordWebhookUrl || null },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[PATCH /api/orgs/notifications]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
