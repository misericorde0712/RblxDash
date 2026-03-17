import { PrismaClient } from "@prisma/client"
import { randomBytes, createHash } from "crypto"

const prisma = new PrismaClient()

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex")
}

async function main() {
  console.log("Seeding database...")

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
  console.log(`  User: ${user.email} (${user.id})`)

  // ─── Subscription (FREE) ────────────────────────────────────────────────
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
  console.log("  Subscription: STUDIO / ACTIVE")

  // ─── Organization ────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "dev-studio" },
    update: {},
    create: {
      name: "Dev Studio",
      slug: "dev-studio",
      billingOwnerId: user.id,
    },
  })
  console.log(`  Organization: ${org.name} (${org.slug})`)

  // ─── OrgMember ───────────────────────────────────────────────────────────
  await prisma.orgMember.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: {
      userId: user.id,
      orgId: org.id,
      role: "OWNER",
    },
  })

  // ─── Game ────────────────────────────────────────────────────────────────
  const game = await prisma.game.upsert({
    where: { id: "seed_game_001" },
    update: {},
    create: {
      id: "seed_game_001",
      name: "Demo Adventure",
      robloxPlaceId: "123456789",
      robloxUniverseId: "987654321",
      webhookSecret: randomBytes(32).toString("hex"),
      modules: ["players", "logs", "moderation", "analytics", "economy"],
      orgId: org.id,
    },
  })
  console.log(`  Game: ${game.name} (${game.id})`)

  // ─── Tracked Players ─────────────────────────────────────────────────────
  const players = [
    { robloxId: "100001", username: "CoolBuilder42", displayName: "Cool Builder", isOnline: true },
    { robloxId: "100002", username: "SpeedRunner99", displayName: "Speed Runner", isOnline: true },
    { robloxId: "100003", username: "LuaScripter", displayName: "Lua Dev", isOnline: false },
    { robloxId: "100004", username: "ToxicGamer", displayName: "Toxic", isOnline: false },
    { robloxId: "100005", username: "NewPlayer2024", displayName: "Newbie", isOnline: true },
  ]

  for (const p of players) {
    await prisma.trackedPlayer.upsert({
      where: { gameId_robloxId: { gameId: game.id, robloxId: p.robloxId } },
      update: {},
      create: {
        gameId: game.id,
        robloxId: p.robloxId,
        username: p.username,
        displayName: p.displayName,
        isOnline: p.isOnline,
        lastSeenAt: p.isOnline ? new Date() : new Date(Date.now() - 3600_000),
      },
    })
  }
  console.log(`  Players: ${players.length} tracked`)

  // ─── Sanctions ───────────────────────────────────────────────────────────
  await prisma.sanction.upsert({
    where: { id: "seed_sanction_001" },
    update: {},
    create: {
      id: "seed_sanction_001",
      gameId: game.id,
      robloxId: "100004",
      type: "BAN",
      reason: "Exploiting — speed hack detected",
      moderator: user.id,
      active: true,
      deliveryStatus: "APPLIED",
      deliveredAt: new Date(),
    },
  })
  await prisma.sanction.upsert({
    where: { id: "seed_sanction_002" },
    update: {},
    create: {
      id: "seed_sanction_002",
      gameId: game.id,
      robloxId: "100003",
      type: "KICK",
      reason: "AFK for too long",
      moderator: user.id,
      active: false,
      deliveryStatus: "APPLIED",
      deliveredAt: new Date(Date.now() - 86400_000),
    },
  })
  console.log("  Sanctions: 2 created")

  // ─── Player Notes ────────────────────────────────────────────────────────
  await prisma.playerNote.upsert({
    where: { id: "seed_note_001" },
    update: {},
    create: {
      id: "seed_note_001",
      gameId: game.id,
      robloxId: "100004",
      authorId: user.id,
      content: "Known exploiter, multiple reports from community.",
    },
  })
  console.log("  Notes: 1 created")

  // ─── Game Logs ───────────────────────────────────────────────────────────
  const events = ["player.join", "player.leave", "economy.purchase", "moderation.ban", "server.heartbeat"]
  const logs = Array.from({ length: 50 }, (_, i) => ({
    event: events[i % events.length],
    payload: { robloxId: players[i % players.length].robloxId, timestamp: Date.now() - i * 60_000 },
    robloxId: players[i % players.length].robloxId,
    gameId: game.id,
    createdAt: new Date(Date.now() - i * 60_000),
  }))

  await prisma.gameLog.createMany({ data: logs, skipDuplicates: true })
  console.log(`  Logs: ${logs.length} events`)

  // ─── Analytics Snapshots ─────────────────────────────────────────────────
  const snapshots = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)
    return {
      gameId: game.id,
      date,
      activePlayers: Math.floor(80 + Math.random() * 200),
      newPlayers: Math.floor(5 + Math.random() * 30),
      revenue: Math.floor(Math.random() * 500),
      sessions: Math.floor(100 + Math.random() * 300),
    }
  })

  for (const snap of snapshots) {
    await prisma.analyticsSnapshot.upsert({
      where: { gameId_date: { gameId: snap.gameId, date: snap.date } },
      update: snap,
      create: snap,
    })
  }
  console.log(`  Analytics: ${snapshots.length} daily snapshots`)

  // ─── Live Servers ────────────────────────────────────────────────────────
  const servers = [
    { jobId: "server-us-east-001", region: "us-east", lastPlayerCount: 12 },
    { jobId: "server-eu-west-001", region: "eu-west", lastPlayerCount: 8 },
    { jobId: "server-ap-south-001", region: "ap-south", lastPlayerCount: 3 },
  ]

  for (const s of servers) {
    await prisma.liveServer.upsert({
      where: { gameId_jobId: { gameId: game.id, jobId: s.jobId } },
      update: { lastHeartbeatAt: new Date(), lastPlayerCount: s.lastPlayerCount },
      create: {
        gameId: game.id,
        jobId: s.jobId,
        placeId: game.robloxPlaceId,
        region: s.region,
        lastPlayerCount: s.lastPlayerCount,
        lastPlayerIds: players.slice(0, s.lastPlayerCount > 5 ? 5 : s.lastPlayerCount).map((p) => p.robloxId),
        lastHeartbeatAt: new Date(),
      },
    })
  }
  console.log(`  Servers: ${servers.length} live`)

  // ─── Audit Logs ──────────────────────────────────────────────────────────
  const auditEvents = [
    { event: "workspace.created", targetType: "organization", targetId: org.id },
    { event: "game.created", targetType: "game", targetId: game.id },
    { event: "sanction.created", targetType: "sanction", targetId: "seed_sanction_001" },
  ]
  for (const a of auditEvents) {
    await prisma.auditLog.create({
      data: {
        orgId: org.id,
        actorUserId: user.id,
        event: a.event,
        targetType: a.targetType,
        targetId: a.targetId,
      },
    })
  }
  console.log(`  Audit logs: ${auditEvents.length} entries`)

  console.log("\nSeed complete!")
}

main()
  .catch((e) => {
    console.error("Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
