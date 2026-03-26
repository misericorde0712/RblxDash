import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { randomBytes, createHash } from "crypto"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex")
}

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min))
}

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000)
}

function minutesAgo(m: number) {
  return new Date(Date.now() - m * 60_000)
}

function daysAgo(d: number) {
  const date = new Date()
  date.setDate(date.getDate() - d)
  return date
}

async function main() {
  console.log("Seeding database with demo data...")

  // ─── User ────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { clerkId: "seed_user_001" },
    update: {},
    create: {
      clerkId: "seed_user_001",
      email: "dev@rblxdash.local",
      name: "Dev User",
    },
  })

  const moderator = await prisma.user.upsert({
    where: { clerkId: "seed_user_002" },
    update: {},
    create: {
      clerkId: "seed_user_002",
      email: "mod@rblxdash.local",
      name: "Alex Moderator",
    },
  })

  console.log(`  Users: ${user.email}, ${moderator.email}`)

  // ─── Subscription (STUDIO) ────────────────────────────────────────────────
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      stripeCustomerId: `cus_seed_${user.id}`,
      plan: "STUDIO",
      status: "ACTIVE",
    },
  })
  await prisma.subscription.upsert({
    where: { userId: moderator.id },
    update: {},
    create: {
      userId: moderator.id,
      stripeCustomerId: `cus_seed_${moderator.id}`,
      plan: "STUDIO",
      status: "ACTIVE",
    },
  })
  console.log("  Subscription: STUDIO / ACTIVE")

  // ─── Organization ────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "nova-games" },
    update: {},
    create: {
      name: "Nova Games",
      slug: "nova-games",
      billingOwnerId: user.id,
    },
  })
  console.log(`  Organization: ${org.name}`)

  // ─── OrgMembers ────────────────────────────────────────────────────────
  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: "OWNER" },
  })
  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: moderator.id, orgId: org.id } },
    update: {},
    create: { userId: moderator.id, orgId: org.id, role: "MODERATOR" },
  })

  // ─── Game ────────────────────────────────────────────────────────────────
  const game = await prisma.game.upsert({
    where: { id: "seed_game_001" },
    update: {},
    create: {
      id: "seed_game_001",
      name: "Starbound Odyssey",
      robloxPlaceId: "4582710396",
      robloxUniverseId: "1738290564",
      webhookSecret: randomBytes(32).toString("hex"),
      modules: ["players", "logs", "moderation", "analytics", "economy"],
      orgId: org.id,
      configVersion: 4,
      eventVersion: 3,
    },
  })
  console.log(`  Game: ${game.name}`)

  // ─── Tracked Players (35 players, realistic Roblox names) ──────────────
  const playerData = [
    // Online players (18)
    { robloxId: "2847591036", username: "xStarLord_42x", displayName: "StarLord", isOnline: true, server: 0 },
    { robloxId: "1938274650", username: "BloxMasterZero", displayName: "BloxMaster", isOnline: true, server: 0 },
    { robloxId: "3920184756", username: "iiSkyFallii", displayName: "SkyFall", isOnline: true, server: 0 },
    { robloxId: "4817293650", username: "CrimsonWolf_YT", displayName: "CrimsonWolf", isOnline: true, server: 0 },
    { robloxId: "5728194036", username: "xXDarkPhoenixXx", displayName: "DarkPhoenix", isOnline: true, server: 0 },
    { robloxId: "6019283745", username: "NoobSlayer9000", displayName: "NoobSlayer", isOnline: true, server: 0 },
    { robloxId: "7102938465", username: "Pixel_Builder", displayName: "PixelBuilder", isOnline: true, server: 1 },
    { robloxId: "8291034756", username: "AceGamer2024", displayName: "Ace", isOnline: true, server: 1 },
    { robloxId: "9382014567", username: "Luna_Playz", displayName: "Luna", isOnline: true, server: 1 },
    { robloxId: "1047382956", username: "TurboRacer_X", displayName: "TurboRacer", isOnline: true, server: 1 },
    { robloxId: "1192837465", username: "QueenBee_Rblx", displayName: "QueenBee", isOnline: true, server: 2 },
    { robloxId: "1283947560", username: "ShadowNinja_Pro", displayName: "ShadowNinja", isOnline: true, server: 2 },
    { robloxId: "1374850291", username: "FrostyGaming101", displayName: "Frosty", isOnline: true, server: 2 },
    { robloxId: "1465920384", username: "RocketKid_YT", displayName: "RocketKid", isOnline: true, server: 3 },
    { robloxId: "1556038472", username: "emerald_craft", displayName: "EmeraldCraft", isOnline: true, server: 3 },
    { robloxId: "1647291038", username: "ViperStrike_X", displayName: "ViperStrike", isOnline: true, server: 4 },
    { robloxId: "1738402951", username: "CosmicDust99", displayName: "CosmicDust", isOnline: true, server: 4 },
    { robloxId: "1829504736", username: "BlazeRunner_TV", displayName: "BlazeRunner", isOnline: true, server: 4 },
    // Offline players (17)
    { robloxId: "2019384756", username: "xXToxicRageXx", displayName: "ToxicRage", isOnline: false, server: -1 },
    { robloxId: "2110293847", username: "SpeedDemon_77", displayName: "SpeedDemon", isOnline: false, server: -1 },
    { robloxId: "2201938475", username: "IcyBlaze_YT", displayName: "IcyBlaze", isOnline: false, server: -1 },
    { robloxId: "2392847561", username: "GhostRider_Pro", displayName: "GhostRider", isOnline: false, server: -1 },
    { robloxId: "2483019275", username: "MegaBuilder_X", displayName: "MegaBuilder", isOnline: false, server: -1 },
    { robloxId: "2574928301", username: "NeonWave2025", displayName: "NeonWave", isOnline: false, server: -1 },
    { robloxId: "2665837412", username: "DragonFly_99", displayName: "DragonFly", isOnline: false, server: -1 },
    { robloxId: "2756748523", username: "Th3_L3g3nd", displayName: "Legend", isOnline: false, server: -1 },
    { robloxId: "2847659634", username: "StormChaser_YT", displayName: "StormChaser", isOnline: false, server: -1 },
    { robloxId: "2938570745", username: "PixelPrincess", displayName: "PixelPrincess", isOnline: false, server: -1 },
    { robloxId: "3029481856", username: "CodeMaster_Dev", displayName: "CodeMaster", isOnline: false, server: -1 },
    { robloxId: "3120392967", username: "xXHackerManXx", displayName: "HackerMan", isOnline: false, server: -1 },
    { robloxId: "3211204078", username: "GalaxyKing_YT", displayName: "GalaxyKing", isOnline: false, server: -1 },
    { robloxId: "3302115189", username: "NightOwl_Playz", displayName: "NightOwl", isOnline: false, server: -1 },
    { robloxId: "3493026200", username: "ThunderBolt_X", displayName: "ThunderBolt", isOnline: false, server: -1 },
  ]

  const serverJobIds = [
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "d4e5f6a7-b8c9-0123-defa-234567890123",
    "e5f6a7b8-c9d0-1234-efab-345678901234",
  ]

  const servers = [
    { jobId: serverJobIds[0], region: "us-east", lastPlayerCount: 6, startedAt: hoursAgo(4) },
    { jobId: serverJobIds[1], region: "us-east", lastPlayerCount: 4, startedAt: hoursAgo(2) },
    { jobId: serverJobIds[2], region: "eu-west", lastPlayerCount: 3, startedAt: hoursAgo(6) },
    { jobId: serverJobIds[3], region: "eu-west", lastPlayerCount: 2, startedAt: hoursAgo(1) },
    { jobId: serverJobIds[4], region: "ap-southeast", lastPlayerCount: 3, startedAt: hoursAgo(3) },
  ]

  for (const s of servers) {
    const serverPlayers = playerData.filter((p) => p.server === servers.indexOf(s)).map((p) => p.robloxId)
    await prisma.liveServer.upsert({
      where: { gameId_jobId: { gameId: game.id, jobId: s.jobId } },
      update: { lastHeartbeatAt: minutesAgo(randomBetween(0, 2)), lastPlayerCount: s.lastPlayerCount, lastPlayerIds: serverPlayers },
      create: {
        gameId: game.id,
        jobId: s.jobId,
        placeId: game.robloxPlaceId,
        region: s.region,
        lastPlayerCount: s.lastPlayerCount,
        lastPlayerIds: serverPlayers,
        lastHeartbeatAt: minutesAgo(randomBetween(0, 2)),
        startedAt: s.startedAt,
      },
    })
  }
  console.log(`  Servers: ${servers.length} live`)

  for (const p of playerData) {
    const firstSeen = daysAgo(randomBetween(1, 60))
    const lastSeen = p.isOnline ? minutesAgo(randomBetween(0, 5)) : hoursAgo(randomBetween(1, 48))
    await prisma.trackedPlayer.upsert({
      where: { gameId_robloxId: { gameId: game.id, robloxId: p.robloxId } },
      update: {},
      create: {
        gameId: game.id,
        robloxId: p.robloxId,
        username: p.username,
        displayName: p.displayName,
        isOnline: p.isOnline,
        currentServerJobId: p.isOnline ? serverJobIds[p.server] : null,
        firstSeenAt: firstSeen,
        lastSeenAt: lastSeen,
        lastSessionStartedAt: p.isOnline ? hoursAgo(randomBetween(0, 2)) : hoursAgo(randomBetween(3, 24)),
        lastSessionEndedAt: p.isOnline ? null : hoursAgo(randomBetween(1, 12)),
      },
    })
  }
  console.log(`  Players: ${playerData.length} tracked (${playerData.filter((p) => p.isOnline).length} online)`)

  // ─── Sanctions ───────────────────────────────────────────────────────────
  const sanctions = [
    { id: "seed_sanction_001", robloxId: "2019384756", type: "BAN" as const, reason: "Speed hacking - teleporting across map", active: true, status: "APPLIED" as const, mod: user.id, createdAt: hoursAgo(6) },
    { id: "seed_sanction_002", robloxId: "3120392967", type: "BAN" as const, reason: "Exploiting - infinite coins glitch", active: true, status: "APPLIED" as const, mod: user.id, createdAt: daysAgo(2) },
    { id: "seed_sanction_003", robloxId: "2665837412", type: "TIMEOUT" as const, reason: "Toxic behavior in chat", active: true, status: "APPLIED" as const, mod: moderator.id, createdAt: hoursAgo(3), expiresAt: hoursAgo(-21) },
    { id: "seed_sanction_004", robloxId: "2201938475", type: "KICK" as const, reason: "AFK too long during event", active: false, status: "APPLIED" as const, mod: moderator.id, createdAt: daysAgo(1) },
    { id: "seed_sanction_005", robloxId: "2756748523", type: "KICK" as const, reason: "Spamming trade requests", active: false, status: "APPLIED" as const, mod: moderator.id, createdAt: daysAgo(3) },
    { id: "seed_sanction_006", robloxId: "3302115189", type: "TIMEOUT" as const, reason: "Team killing in PvE mode", active: false, status: "APPLIED" as const, mod: user.id, createdAt: daysAgo(5) },
    { id: "seed_sanction_007", robloxId: "2110293847", type: "BAN" as const, reason: "Selling in-game items for real money", active: true, status: "PENDING" as const, mod: user.id, createdAt: minutesAgo(15) },
  ]

  for (const s of sanctions) {
    await prisma.sanction.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        gameId: game.id,
        robloxId: s.robloxId,
        type: s.type,
        reason: s.reason,
        moderator: s.mod,
        active: s.active,
        deliveryStatus: s.status,
        deliveredAt: s.status === "APPLIED" ? s.createdAt : null,
        expiresAt: s.expiresAt ?? null,
        createdAt: s.createdAt,
      },
    })
  }
  console.log(`  Sanctions: ${sanctions.length} created`)

  // ─── Player Notes ──────────────────────────────────────────────────────
  const notes = [
    { id: "seed_note_001", robloxId: "2019384756", author: user.id, content: "Multiple speed hack reports from community. Confirmed via logs - teleporting 500+ studs in single frame.", createdAt: hoursAgo(7) },
    { id: "seed_note_002", robloxId: "2019384756", author: moderator.id, content: "Player sent appeal via Discord. Denied - clear evidence.", createdAt: hoursAgo(5) },
    { id: "seed_note_003", robloxId: "3120392967", author: user.id, content: "Used infinite coins exploit. Economy impact: ~45,000 coins generated illegitimately.", createdAt: daysAgo(2) },
    { id: "seed_note_004", robloxId: "2847591036", author: moderator.id, content: "Content creator - 15K subscribers. Very active in community.", createdAt: daysAgo(10) },
    { id: "seed_note_005", robloxId: "2665837412", author: moderator.id, content: "Third warning for toxic chat. Next offense = temp ban.", createdAt: hoursAgo(3) },
    { id: "seed_note_006", robloxId: "1938274650", author: user.id, content: "Beta tester. Reported 3 critical bugs. Consider giving VIP.", createdAt: daysAgo(5) },
  ]

  for (const n of notes) {
    await prisma.playerNote.upsert({
      where: { id: n.id },
      update: {},
      create: {
        id: n.id,
        gameId: game.id,
        robloxId: n.robloxId,
        authorId: n.author,
        content: n.content,
        createdAt: n.createdAt,
      },
    })
  }
  console.log(`  Notes: ${notes.length} created`)

  // ─── Game Logs (500+ events, realistic distribution) ───────────────────
  const allLogs: Array<{
    event: string
    payload: Record<string, unknown>
    robloxId: string | null
    gameId: string
    createdAt: Date
  }> = []

  const onlinePlayers = playerData.filter((p) => p.isOnline)
  const allPlayers = playerData

  // Server heartbeats (every ~60s for each server, last 24h = ~1440 per server, we'll do last 2h)
  for (const s of servers) {
    const sPlayers = playerData.filter((p) => p.server === servers.indexOf(s))
    for (let m = 0; m < 120; m += 2) {
      allLogs.push({
        event: "server_heartbeat",
        payload: {
          jobId: s.jobId,
          placeId: game.robloxPlaceId,
          playerCount: s.lastPlayerCount + randomBetween(-1, 1),
          uptimeSeconds: (servers.indexOf(s) + 1) * 3600 + m * 60,
          playerIds: sPlayers.map((p) => p.robloxId),
        },
        robloxId: null,
        gameId: game.id,
        createdAt: minutesAgo(m),
      })
    }
  }

  // Server starts
  for (const s of servers) {
    allLogs.push({
      event: "server_started",
      payload: { jobId: s.jobId, placeId: game.robloxPlaceId, playerCount: 0 },
      robloxId: null,
      gameId: game.id,
      createdAt: s.startedAt,
    })
  }

  // Player joins & leaves (spread across last 24h)
  for (let i = 0; i < 180; i++) {
    const player = allPlayers[randomBetween(0, allPlayers.length)]
    const minsAgo = randomBetween(1, 1440)
    const serverIdx = randomBetween(0, servers.length)
    allLogs.push({
      event: "player_join",
      payload: {
        jobId: serverJobIds[serverIdx],
        placeId: game.robloxPlaceId,
        username: player.username,
        displayName: player.displayName,
      },
      robloxId: player.robloxId,
      gameId: game.id,
      createdAt: minutesAgo(minsAgo),
    })
    // Most joins have a corresponding leave
    if (Math.random() > 0.3) {
      const sessionLength = randomBetween(5, 120)
      if (minsAgo - sessionLength > 0) {
        allLogs.push({
          event: "player_leave",
          payload: {
            jobId: serverJobIds[serverIdx],
            placeId: game.robloxPlaceId,
            sessionDuration: sessionLength * 60,
          },
          robloxId: player.robloxId,
          gameId: game.id,
          createdAt: minutesAgo(minsAgo - sessionLength),
        })
      }
    }
  }

  // Economy events (purchases, rewards, spending)
  const currencies = ["Coins", "Gems", "Robux"]
  const products = [
    { name: "Legendary Sword", price: 2500, currency: "Coins" },
    { name: "Speed Boost x5", price: 150, currency: "Gems" },
    { name: "VIP Pass", price: 399, currency: "Robux" },
    { name: "Pet Egg (Mythic)", price: 1000, currency: "Coins" },
    { name: "Double XP 1h", price: 75, currency: "Gems" },
    { name: "Starter Pack", price: 199, currency: "Robux" },
    { name: "Golden Armor Set", price: 5000, currency: "Coins" },
    { name: "Teleport Pass", price: 50, currency: "Gems" },
    { name: "Premium Crate", price: 499, currency: "Robux" },
    { name: "Healing Potion x10", price: 300, currency: "Coins" },
  ]

  for (let i = 0; i < 120; i++) {
    const player = allPlayers[randomBetween(0, allPlayers.length)]
    const minsAgo = randomBetween(1, 1440)

    if (Math.random() > 0.6) {
      // Shop/Robux purchase
      const product = products[randomBetween(0, products.length)]
      const isRobux = product.currency === "Robux"
      allLogs.push({
        event: "player_action",
        payload: {
          action: isRobux ? "robux_purchase_completed" : "shop_purchase_completed",
          productName: product.name,
          amount: product.price,
          currency: product.currency,
          purchaseType: isRobux ? "developer_product" : "in_game",
          jobId: serverJobIds[randomBetween(0, servers.length)],
        },
        robloxId: player.robloxId,
        gameId: game.id,
        createdAt: minutesAgo(minsAgo),
      })
    } else if (Math.random() > 0.4) {
      // Economy flow (source/sink)
      const isSource = Math.random() > 0.4
      const currency = currencies[randomBetween(0, 2)] // Coins or Gems only
      allLogs.push({
        event: "player_action",
        payload: {
          action: "economy",
          flowType: isSource ? "source" : "sink",
          currency,
          amount: randomBetween(10, 2000),
          entry: isSource ? "daily_reward" : "shop_purchase",
          rewardId: isSource ? `day_${randomBetween(1, 30)}` : undefined,
          jobId: serverJobIds[randomBetween(0, servers.length)],
        },
        robloxId: player.robloxId,
        gameId: game.id,
        createdAt: minutesAgo(minsAgo),
      })
    } else {
      // Daily reward
      allLogs.push({
        event: "player_action",
        payload: {
          action: "daily_reward_claimed",
          rewardId: `day_${randomBetween(1, 30)}`,
          amount: randomBetween(50, 500),
          currency: "Coins",
          jobId: serverJobIds[randomBetween(0, servers.length)],
        },
        robloxId: player.robloxId,
        gameId: game.id,
        createdAt: minutesAgo(minsAgo),
      })
    }
  }

  // Progression events
  const progressionSteps = ["tutorial_completed", "level_up", "quest_completed", "boss_defeated", "zone_unlocked", "achievement_earned"]
  const systems = ["quests", "combat", "exploration", "crafting", "pets"]

  for (let i = 0; i < 80; i++) {
    const player = allPlayers[randomBetween(0, allPlayers.length)]
    const step = progressionSteps[randomBetween(0, progressionSteps.length)]
    allLogs.push({
      event: "player_action",
      payload: {
        action: "progression",
        step,
        system: systems[randomBetween(0, systems.length)],
        questId: step === "quest_completed" ? `quest_${randomBetween(1, 50)}` : undefined,
        xp: randomBetween(25, 500),
        jobId: serverJobIds[randomBetween(0, servers.length)],
      },
      robloxId: player.robloxId,
      gameId: game.id,
      createdAt: minutesAgo(randomBetween(1, 1440)),
    })
  }

  // Round finished events
  const maps = ["Crystal Caverns", "Neon City", "Frozen Peaks", "Lava Island", "Sky Temple"]
  for (let i = 0; i < 40; i++) {
    const player = allPlayers[randomBetween(0, allPlayers.length)]
    allLogs.push({
      event: "player_action",
      payload: {
        action: "round_finished",
        result: Math.random() > 0.3 ? "victory" : "defeat",
        map: maps[randomBetween(0, maps.length)],
        durationSeconds: randomBetween(120, 600),
        jobId: serverJobIds[randomBetween(0, servers.length)],
      },
      robloxId: player.robloxId,
      gameId: game.id,
      createdAt: minutesAgo(randomBetween(1, 1440)),
    })
  }

  // Moderation applied events
  for (const s of sanctions) {
    if (s.status === "APPLIED") {
      allLogs.push({
        event: "player_action",
        payload: { action: "moderation_applied", sanctionType: s.type, reason: s.reason },
        robloxId: s.robloxId,
        gameId: game.id,
        createdAt: s.createdAt,
      })
    }
  }

  // Sort all logs by date
  allLogs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  // Clear old logs and insert new ones
  await prisma.gameLog.deleteMany({ where: { gameId: game.id } })
  await prisma.gameLog.createMany({ data: allLogs, skipDuplicates: true })
  console.log(`  Logs: ${allLogs.length} events`)

  // ─── Analytics Snapshots (30 days, growing trend) ──────────────────────
  await prisma.analyticsSnapshot.deleteMany({ where: { gameId: game.id } })

  const snapshots = Array.from({ length: 30 }, (_, i) => {
    const day = 29 - i // 0 = oldest, 29 = today
    const date = new Date()
    date.setDate(date.getDate() - (29 - day))
    date.setHours(0, 0, 0, 0)

    // Growing trend with some noise
    const growthFactor = 1 + day * 0.03
    const weekendBoost = [0, 6].includes(date.getDay()) ? 1.4 : 1

    return {
      gameId: game.id,
      date,
      activePlayers: Math.floor((120 + Math.random() * 80) * growthFactor * weekendBoost),
      newPlayers: Math.floor((15 + Math.random() * 25) * growthFactor * weekendBoost),
      revenue: Math.floor((200 + Math.random() * 400) * growthFactor * weekendBoost),
      sessions: Math.floor((180 + Math.random() * 120) * growthFactor * weekendBoost),
    }
  })

  await prisma.analyticsSnapshot.createMany({ data: snapshots })
  console.log(`  Analytics: ${snapshots.length} daily snapshots`)

  // ─── Live Config ───────────────────────────────────────────────────────
  const configs = [
    { key: "max_players_per_server", value: "24", valueType: "number", group: "servers", description: "Maximum players allowed per server instance" },
    { key: "welcome_message", value: '"Welcome to Starbound Odyssey! Type /help for commands."', valueType: "string", group: "general", description: "Message shown to players when they join" },
    { key: "double_xp_enabled", value: "true", valueType: "boolean", group: "events", description: "Enable double XP for all players" },
    { key: "shop_discount_percent", value: "15", valueType: "number", group: "economy", description: "Global shop discount percentage" },
    { key: "maintenance_mode", value: "false", valueType: "boolean", group: "general", description: "Put the game in maintenance mode" },
    { key: "daily_reward_multiplier", value: "2", valueType: "number", group: "economy", description: "Multiplier for daily login rewards" },
    { key: "boss_spawn_config", value: '{"interval": 1800, "difficulty": "hard", "loot_table": "mythic"}', valueType: "json", group: "combat", description: "Boss spawn timing and difficulty settings" },
    { key: "pvp_enabled", value: "true", valueType: "boolean", group: "combat", description: "Allow PvP in designated zones" },
    { key: "max_trade_value", value: "10000", valueType: "number", group: "economy", description: "Maximum value allowed in player trades" },
    { key: "event_banner_text", value: '"Spring Festival - 2x Gems all week!"', valueType: "string", group: "events", description: "Banner text displayed in-game during events" },
  ]

  for (const c of configs) {
    await prisma.liveConfig.upsert({
      where: { gameId_key: { gameId: game.id, key: c.key } },
      update: { value: c.value, valueType: c.valueType, group: c.group, description: c.description },
      create: {
        gameId: game.id,
        key: c.key,
        value: c.value,
        valueType: c.valueType,
        group: c.group,
        description: c.description,
      },
    })
  }
  console.log(`  Live Config: ${configs.length} entries`)

  // ─── Live Events ───────────────────────────────────────────────────────
  const events = [
    {
      name: "Spring Festival",
      slug: "spring-festival",
      description: "Celebrate spring with 2x Gems, exclusive cosmetics, and a limited-time boss!",
      eventData: JSON.stringify({ gemMultiplier: 2, exclusiveItems: ["spring_crown", "blossom_trail"], bossId: "cherry_guardian" }),
      active: true,
      recurrenceType: "ONCE" as const,
      startsAt: daysAgo(2),
      endsAt: daysAgo(-5),
      duration: null,
    },
    {
      name: "Daily Login Bonus",
      slug: "daily-login-bonus",
      description: "Claim your daily reward every day at reset",
      eventData: JSON.stringify({ baseReward: 100, streakBonus: 25 }),
      active: true,
      recurrenceType: "DAILY" as const,
      startsAt: daysAgo(30),
      endsAt: null,
      duration: 1440,
      recurrenceTimeOfDay: "00:00",
    },
    {
      name: "Weekend PvP Tournament",
      slug: "weekend-pvp-tournament",
      description: "Compete in ranked PvP every Saturday and Sunday for exclusive rewards",
      eventData: JSON.stringify({ mode: "ranked", rewards: ["trophy_emote", "pvp_title"], matchDuration: 300 }),
      active: true,
      recurrenceType: "WEEKLY" as const,
      startsAt: daysAgo(14),
      endsAt: null,
      duration: 480,
      recurrenceDaysOfWeek: [0, 6],
      recurrenceTimeOfDay: "14:00",
    },
    {
      name: "Boss Rush Hour",
      slug: "boss-rush-hour",
      description: "Every 3 hours, a mega boss spawns with triple loot drops",
      eventData: JSON.stringify({ bossPool: ["dragon_king", "void_sentinel", "crystal_titan"], lootMultiplier: 3 }),
      active: true,
      recurrenceType: "HOURLY" as const,
      startsAt: daysAgo(7),
      endsAt: null,
      duration: 30,
      recurrenceInterval: 3,
    },
  ]

  for (const e of events) {
    await prisma.liveEvent.upsert({
      where: { gameId_slug: { gameId: game.id, slug: e.slug } },
      update: {},
      create: {
        gameId: game.id,
        name: e.name,
        slug: e.slug,
        description: e.description,
        eventData: e.eventData,
        active: e.active,
        recurrenceType: e.recurrenceType,
        startsAt: e.startsAt,
        endsAt: e.endsAt ?? undefined,
        duration: e.duration ?? undefined,
        recurrenceInterval: e.recurrenceInterval ?? 1,
        recurrenceDaysOfWeek: e.recurrenceDaysOfWeek ?? [],
        recurrenceTimeOfDay: e.recurrenceTimeOfDay ?? undefined,
        timezone: "America/Toronto",
      },
    })
  }
  console.log(`  Live Events: ${events.length} events`)

  // ─── Audit Logs ────────────────────────────────────────────────────────
  await prisma.auditLog.deleteMany({ where: { orgId: org.id } })
  const auditEntries = [
    { event: "workspace.created", targetType: "organization", targetId: org.id, actor: user.id, createdAt: daysAgo(30) },
    { event: "game.created", targetType: "game", targetId: game.id, actor: user.id, createdAt: daysAgo(30) },
    { event: "member.invited", targetType: "user", targetId: moderator.id, actor: user.id, createdAt: daysAgo(28), payload: { email: "mod@rblxdash.local", role: "MODERATOR" } },
    { event: "member.invite_accepted", targetType: "user", targetId: moderator.id, actor: moderator.id, createdAt: daysAgo(28) },
    { event: "player.sanction_added", targetType: "sanction", targetId: "seed_sanction_001", actor: user.id, createdAt: hoursAgo(6), payload: { type: "BAN", robloxId: "2019384756" } },
    { event: "player.sanction_added", targetType: "sanction", targetId: "seed_sanction_002", actor: user.id, createdAt: daysAgo(2), payload: { type: "BAN", robloxId: "3120392967" } },
    { event: "player.sanction_added", targetType: "sanction", targetId: "seed_sanction_003", actor: moderator.id, createdAt: hoursAgo(3), payload: { type: "TIMEOUT", robloxId: "2665837412" } },
    { event: "game.secret_rotated", targetType: "game", targetId: game.id, actor: user.id, createdAt: daysAgo(15) },
  ]

  for (const a of auditEntries) {
    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: a.actor,
        event: a.event,
        targetType: a.targetType,
        targetId: a.targetId,
        payload: a.payload ?? undefined,
        createdAt: a.createdAt,
      },
    })
  }
  console.log(`  Audit logs: ${auditEntries.length} entries`)

  // ─── API Key ───────────────────────────────────────────────────────────
  const rawKey = `rblx_live_${randomBytes(24).toString("hex")}`
  await prisma.apiKey.upsert({
    where: { keyHash: hashKey(rawKey) },
    update: {},
    create: {
      name: "Production API Key",
      keyHash: hashKey(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      orgId: org.id,
      createdById: user.id,
      lastUsedAt: minutesAgo(15),
    },
  })
  console.log("  API Key: 1 created")

  console.log("\nSeed complete!")
  console.log(`\n  Total game logs: ${allLogs.length}`)
  console.log(`  Players: ${playerData.length} (${onlinePlayers.length} online)`)
  console.log(`  Servers: ${servers.length} active`)
  console.log(`  Sanctions: ${sanctions.length}`)
  console.log(`  Live Config: ${configs.length} entries`)
  console.log(`  Live Events: ${events.length} events`)
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
