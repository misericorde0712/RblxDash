import "server-only"
import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

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

export function isEncryptedOpenCloudApiKey(value: string) {
  return value.startsWith(`${ENCRYPTION_PREFIX}:`)
}

export function encryptOpenCloudApiKey(value: string) {
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

export function decryptOpenCloudApiKey(value: string) {
  if (!isEncryptedOpenCloudApiKey(value)) return value

  const parts = value.split(":")
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted Open Cloud API key format")
  }

  const [, version, ivHex, authTagHex, encryptedHex] = parts
  if (version !== "v1") {
    throw new Error(`Unsupported Open Cloud API key version: ${version}`)
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivHex, "hex")
  )
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

export function maskOpenCloudApiKey(value: string) {
  const decryptedValue = decryptOpenCloudApiKey(value)

  if (decryptedValue.length <= 8) {
    return "••••••••"
  }

  return `${decryptedValue.slice(0, 4)}••••${decryptedValue.slice(-4)}`
}
