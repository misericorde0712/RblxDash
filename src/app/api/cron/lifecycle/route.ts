/**
 * Cron job — lifecycle emails
 *
 * Tourne 1x/jour (configuré dans vercel.json).
 * Sécurisé par CRON_SECRET en header Authorization.
 *
 * Ce qu'il fait:
 *   1. Trouve les utilisateurs inscrits il y a 3 jours sans jeu → email "dashboard empty"
 *   2. Trouve les utilisateurs avec trial de 7 jours → email "first week analytics"
 *   3. Trouve les utilisateurs inactifs depuis 7 jours → email "we miss you"
 *   4. Envoie un résumé hebdomadaire aux utilisateurs actifs (chaque lundi)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  sendNoGameConnectedEmail,
  sendWeeklyAnalyticsEmail,
  sendInactiveUserEmail,
  sendWeeklySummaryEmail,
} from "@/lib/email"
import { createLogger } from "@/lib/logger"

const log = createLogger("cron/lifecycle")

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const { env } = await import("@/lib/env.server")
  const cronSecret = env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const now = new Date()
    const results = {
      noGame: 0,
      firstWeek: 0,
      inactive: 0,
      weeklySummary: 0,
    }

    // ─── 1. No game connected (J+3) ─────────────────────────
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

    const noGameUsers = await prisma.user.findMany({
      where: {
        createdAt: { gte: fourDaysAgo, lte: threeDaysAgo },
      },
      select: {
        id: true,
        email: true,
        name: true,
        memberships: {
          select: {
            org: {
              select: { games: { select: { id: true }, take: 1 } },
            },
          },
        },
      },
    })

    for (const user of noGameUsers) {
      const hasGame = user.memberships.some((m) => m.org.games.length > 0)
      if (!hasGame) {
        await sendNoGameConnectedEmail({ to: user.email, name: user.name ?? "" })
        results.noGame++
      }
    }

    // ─── 2. First week analytics (J+7 du trial) ─────────────
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)

    const trialUsers = await prisma.subscription.findMany({
      where: {
        status: "TRIALING",
        createdAt: { gte: eightDaysAgo, lte: sevenDaysAgo },
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            memberships: {
              select: {
                org: {
                  select: {
                    games: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    for (const sub of trialUsers) {
      const user = sub.user
      const gameIds = user.memberships.flatMap((m) => m.org.games.map((g) => g.id))

      if (gameIds.length === 0) continue

      const [totalEvents, uniquePlayers, totalSanctions] = await Promise.all([
        prisma.gameLog.count({
          where: { gameId: { in: gameIds }, createdAt: { gte: sevenDaysAgo } },
        }),
        prisma.trackedPlayer.count({
          where: { gameId: { in: gameIds }, lastSeenAt: { gte: sevenDaysAgo } },
        }),
        prisma.sanction.count({
          where: { gameId: { in: gameIds }, createdAt: { gte: sevenDaysAgo } },
        }),
      ])

      await sendWeeklyAnalyticsEmail({
        to: user.email,
        name: user.name ?? "",
        stats: {
          totalEvents,
          uniquePlayers,
          totalSanctions,
          gamesCount: gameIds.length,
        },
      })
      results.firstWeek++
    }

    // ─── 3. Inactive users (7 jours sans activité dans les audit logs) ──
    // On considère un utilisateur inactif si son dernier audit log date
    // de 7-8 jours (fenêtre d'un jour pour éviter les doublons).
    const usersWithGames = await prisma.user.findMany({
      where: {
        memberships: { some: { org: { games: { some: {} } } } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    for (const user of usersWithGames) {
      const lastActivity = user.auditLogs[0]?.createdAt ?? null
      if (!lastActivity) continue

      const daysSinceActive = (now.getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000)
      if (daysSinceActive >= 7 && daysSinceActive < 8) {
        await sendInactiveUserEmail({ to: user.email, name: user.name ?? "" })
        results.inactive++
      }
    }

    // ─── 4. Weekly summary (lundi seulement) ─────────────────
    const isMonday = now.getUTCDay() === 1

    if (isMonday) {
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const periodStr = `${weekStart.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} – ${now.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`

      const activeUsers = await prisma.user.findMany({
        where: {
          auditLogs: { some: { createdAt: { gte: weekStart } } },
          memberships: { some: { org: { games: { some: {} } } } },
        },
        select: {
          id: true,
          email: true,
          name: true,
          memberships: {
            select: {
              org: {
                select: { games: { select: { id: true } } },
              },
            },
          },
        },
      })

      for (const user of activeUsers) {
        const gameIds = user.memberships.flatMap((m) => m.org.games.map((g) => g.id))
        if (gameIds.length === 0) continue

        const [totalEvents, uniquePlayers, newSanctions] = await Promise.all([
          prisma.gameLog.count({
            where: { gameId: { in: gameIds }, createdAt: { gte: weekStart } },
          }),
          prisma.trackedPlayer.count({
            where: { gameId: { in: gameIds }, lastSeenAt: { gte: weekStart } },
          }),
          prisma.sanction.count({
            where: { gameId: { in: gameIds }, createdAt: { gte: weekStart } },
          }),
        ])

        // Skip if no activity at all
        if (totalEvents === 0 && uniquePlayers === 0) continue

        await sendWeeklySummaryEmail({
          to: user.email,
          name: user.name ?? "",
          stats: {
            totalEvents,
            uniquePlayers,
            newSanctions,
            peakOnline: 0, // Would need time-series data to compute; skip for now
          },
          period: periodStr,
        })
        results.weeklySummary++
      }
    }

    log.info("Lifecycle cron completed", results as Record<string, unknown>)
    return NextResponse.json({ ok: true, ...results })
  } catch (err) {
    log.error("Lifecycle cron failed", {}, err instanceof Error ? err : undefined)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
