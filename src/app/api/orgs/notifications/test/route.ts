import { NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const ctx = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in ctx) return ctx.response

    const org = await prisma.organization.findUnique({
      where: { id: ctx.context.org.id },
      select: { discordWebhookUrl: true, name: true },
    })

    if (!org?.discordWebhookUrl) {
      return NextResponse.json(
        { error: "No Discord webhook URL configured" },
        { status: 400 }
      )
    }

    const res = await fetch(org.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "RblxDash — Test notification",
            color: 0xe8822a,
            description: `This is a test alert from **${org.name}**. If you see this, your Discord webhook is working correctly.`,
            footer: { text: "RblxDash · Test" },
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `Discord returned ${res.status}: ${body.slice(0, 200)}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
