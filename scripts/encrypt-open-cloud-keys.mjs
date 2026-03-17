import "dotenv/config"
import { createCipheriv, randomBytes } from "node:crypto"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"

const ENCRYPTION_PREFIX = "enc:v1"
const IV_BYTES = 12

function getEncryptionKey() {
  const rawKey = process.env.OPEN_CLOUD_API_KEY_ENCRYPTION_KEY?.trim()

  if (!rawKey) {
    throw new Error("OPEN_CLOUD_API_KEY_ENCRYPTION_KEY is not configured")
  }

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error(
      "OPEN_CLOUD_API_KEY_ENCRYPTION_KEY must be a 64-character hex string"
    )
  }

  return Buffer.from(rawKey, "hex")
}

function isEncryptedOpenCloudApiKey(value) {
  return value.startsWith(`${ENCRYPTION_PREFIX}:`)
}

function encryptOpenCloudApiKey(value) {
  if (isEncryptedOpenCloudApiKey(value)) return value

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured")
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    const games = await prisma.game.findMany({
      select: {
        id: true,
        openCloudApiKey: true,
      },
    })

    let updatedCount = 0

    for (const game of games) {
      if (isEncryptedOpenCloudApiKey(game.openCloudApiKey)) {
        continue
      }

      await prisma.game.update({
        where: { id: game.id },
        data: {
          openCloudApiKey: encryptOpenCloudApiKey(game.openCloudApiKey),
        },
      })

      updatedCount += 1
    }

    console.log(`encrypted_games=${updatedCount}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
