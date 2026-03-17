import { createHash, randomBytes } from "crypto"

const KEY_PREFIX = "rd_live_"

/**
 * Génère une clé API brute: rd_live_ + 32 bytes base64url
 * Exemple: rd_live_A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0
 */
export function generateApiKey(): string {
  return KEY_PREFIX + randomBytes(32).toString("base64url")
}

/**
 * Hache une clé API avec SHA-256 pour stockage en DB.
 * On ne stocke jamais la clé brute.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex")
}

/**
 * Extrait le préfixe affichable d'une clé (les 12 premiers chars après rd_live_).
 * Exemple: "rd_live_A1b2C3d4..." → "rd_live_A1b2"
 */
export function getKeyDisplayPrefix(rawKey: string): string {
  return rawKey.slice(0, KEY_PREFIX.length + 4) + "..."
}

/**
 * Vérifie que la chaîne ressemble à une clé API valide.
 */
export function isValidApiKeyFormat(value: string): boolean {
  return value.startsWith(KEY_PREFIX) && value.length > KEY_PREFIX.length + 16
}
