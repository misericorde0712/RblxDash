/**
 * Cron job — lifecycle emails
 *
 * Tourne 1x/jour (configuré dans vercel.json).
 * Sécurisé par CRON_SECRET en header Authorization.
 *
 * Ce qu'il fait:
 *   - Trouve les utilisateurs inscrits il y a 3 jours qui n'ont jamais connecté de jeu
 *   - Leur envoie l'email "your dashboard is still empty"
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendNoGameConnectedEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

    // Utilisateurs créés entre J-4 et J-3 (fenêtre d'un jour pour éviter les doublons)
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: fourDaysAgo,
          lte: threeDaysAgo,
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          select: {
            org: {
              select: {
                games: {
                  select: { id: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    let sent = 0

    for (const user of users) {
      // Vérifier si l'utilisateur a au moins un jeu connecté
      const hasGame = user.memberships.some((m) => m.org.games.length > 0)

      if (!hasGame) {
        await sendNoGameConnectedEmail({ to: user.email, name: user.name ?? "" })
        sent++
      }
    }

    console.log(`[cron/lifecycle] Emails sent: ${sent} / ${users.length} users checked`)
    return NextResponse.json({ ok: true, sent, checked: users.length })
  } catch (err) {
    console.error("[GET /api/cron/lifecycle]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
