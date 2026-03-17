import "server-only"
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"

const ENCRYPTION_PREFIX = "enc:v1"
const IV_BYTES = 12
const ROBLOX_OAUTH_BASE_URL = "https://apis.roblox.com/oauth"
const DEFAULT_ROBLOX_OAUTH_SCOPES = [
  "openid",
  "profile",
  "asset:read",
  "asset:write",
  "universe-messaging-service:publish",
  "user.advanced:read",
]

export type RobloxOAuthConfig = {
  clientId: string
  clientSecret: string
  scopes: string[]
}

export type RobloxTokenResponse = {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in: number
  scope?: string
  id_token?: string
}

export type RobloxUserInfo = {
  sub: string
  name?: string
  nickname?: string
  preferred_username?: string
  profile?: string
  picture?: string
  email?: string
}

function getRobloxOAuthEncryptionKey() {
  const rawKey =
    process.env.ROBLOX_OAUTH_ENCRYPTION_KEY?.trim() ||
    process.env.OPEN_CLOUD_API_KEY_ENCRYPTION_KEY?.trim()

  if (!rawKey) {
    throw new Error(
      "ROBLOX_OAUTH_ENCRYPTION_KEY or OPEN_CLOUD_API_KEY_ENCRYPTION_KEY must be configured"
    )
  }

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error(
      "ROBLOX_OAUTH_ENCRYPTION_KEY must be a 64-character hex string"
    )
  }

  return Buffer.from(rawKey, "hex")
}

export function isRobloxOAuthConfigured() {
  return Boolean(
    process.env.ROBLOX_OAUTH_CLIENT_ID?.trim() &&
      process.env.ROBLOX_OAUTH_CLIENT_SECRET?.trim()
  )
}

export function isRobloxOAuthPublicEnabled() {
  return process.env.ROBLOX_OAUTH_PUBLIC_ENABLED?.trim() === "true"
}

export function getRobloxOAuthConfig() {
  const clientId = process.env.ROBLOX_OAUTH_CLIENT_ID?.trim()
  const clientSecret = process.env.ROBLOX_OAUTH_CLIENT_SECRET?.trim()

  if (!clientId || !clientSecret) {
    return null
  }

  const configuredScopes =
    process.env.ROBLOX_OAUTH_SCOPES?.trim() || DEFAULT_ROBLOX_OAUTH_SCOPES.join(" ")

  return {
    clientId,
    clientSecret,
    scopes: configuredScopes
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean),
  } satisfies RobloxOAuthConfig
}

export function encryptRobloxOAuthSecret(value: string) {
  if (value.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    return value
  }

  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv("aes-256-gcm", getRobloxOAuthEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}:${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptRobloxOAuthSecret(value: string) {
  if (!value.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    return value
  }

  const parts = value.split(":")
  if (parts.length !== 5) {
    throw new Error("Invalid encrypted Roblox OAuth secret format")
  }

  const [, version, ivHex, authTagHex, encryptedHex] = parts
  if (version !== "v1") {
    throw new Error(`Unsupported Roblox OAuth secret version: ${version}`)
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getRobloxOAuthEncryptionKey(),
    Buffer.from(ivHex, "hex")
  )
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}

export function createRobloxOAuthState() {
  return randomBytes(24).toString("base64url")
}

export function createPkceCodeVerifier() {
  return randomBytes(48).toString("base64url")
}

export function createPkceCodeChallenge(codeVerifier: string) {
  return createHash("sha256").update(codeVerifier).digest("base64url")
}

export function buildRobloxOAuthAuthorizationUrl(params: {
  redirectUri: string
  state: string
  codeChallenge: string
}) {
  const config = getRobloxOAuthConfig()

  if (!config) {
    throw new Error("Roblox OAuth is not configured")
  }

  const search = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: params.redirectUri,
    scope: config.scopes.join(" "),
    response_type: "code",
    prompt: "consent select_account",
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  })

  return `${ROBLOX_OAUTH_BASE_URL}/v1/authorize?${search.toString()}`
}

async function readRobloxOAuthError(response: Response) {
  const text = await response.text()

  try {
    const json = JSON.parse(text) as {
      error?: string
      error_description?: string
      message?: string
    }

    return json.error_description || json.message || json.error || text
  } catch {
    return text
  }
}

export async function exchangeRobloxAuthorizationCode(params: {
  code: string
  codeVerifier: string
  redirectUri: string
}) {
  const config = getRobloxOAuthConfig()

  if (!config) {
    throw new Error("Roblox OAuth is not configured")
  }

  const body = new URLSearchParams({
    code: params.code,
    code_verifier: params.codeVerifier,
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: params.redirectUri,
  })

  const response = await fetch(`${ROBLOX_OAUTH_BASE_URL}/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await readRobloxOAuthError(response))
  }

  return (await response.json()) as RobloxTokenResponse
}

export async function refreshRobloxAccessToken(refreshToken: string) {
  const config = getRobloxOAuthConfig()

  if (!config) {
    throw new Error("Roblox OAuth is not configured")
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const response = await fetch(`${ROBLOX_OAUTH_BASE_URL}/v1/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await readRobloxOAuthError(response))
  }

  return (await response.json()) as RobloxTokenResponse
}

export async function revokeRobloxRefreshToken(refreshToken: string) {
  const config = getRobloxOAuthConfig()

  if (!config) {
    return
  }

  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    token: refreshToken,
  })

  await fetch(`${ROBLOX_OAUTH_BASE_URL}/v1/token/revoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  }).catch(() => undefined)
}

export async function fetchRobloxUserInfo(accessToken: string) {
  const response = await fetch(`${ROBLOX_OAUTH_BASE_URL}/v1/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(await readRobloxOAuthError(response))
  }

  return (await response.json()) as RobloxUserInfo
}

export function buildRobloxProfileUrl(robloxUserId: string) {
  return `https://www.roblox.com/users/${robloxUserId}/profile`
}

export function getRobloxTokenExpiresAt(expiresInSeconds: number) {
  const safeExpiresIn = Number.isFinite(expiresInSeconds) ? expiresInSeconds : 900
  return new Date(Date.now() + safeExpiresIn * 1000)
}

export function parseRobloxScopes(scope: string | undefined) {
  return (scope ?? "")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean)
}
