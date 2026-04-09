import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto"
import type { User } from "@prisma/client"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { env } from "@/lib/env.server"
import { prisma } from "@/lib/prisma"

export const LOCAL_AUTH_SESSION_COOKIE = "rblxdash_local_session"
const LOCAL_AUTH_SESSION_DAYS = 30

type LocalSessionPayload = {
  userId: string
  exp: number
}

export type AuthUser = {
  id: string
  fullName: string | null
  username: string | null
  emailAddresses: Array<{ emailAddress: string }>
  passwordEnabled: boolean
}

function getLocalAuthSecret() {
  if (!env.LOCAL_AUTH_SECRET) {
    throw new Error("LOCAL_AUTH_SECRET is required when SELF_HOSTED=true.")
  }

  return env.LOCAL_AUTH_SECRET
}

function getSessionMaxAgeSeconds() {
  return LOCAL_AUTH_SESSION_DAYS * 24 * 60 * 60
}

export function normalizeLocalAuthEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getLocalAuthClerkId(email: string) {
  return `local:${normalizeLocalAuthEmail(email)}`
}

function buildUsername(email: string) {
  return email.split("@")[0] ?? email
}

export function toAuthUser(
  user: Pick<User, "clerkId" | "email" | "name" | "passwordHash">
): AuthUser {
  return {
    id: user.clerkId,
    fullName: user.name ?? null,
    username: buildUsername(user.email),
    emailAddresses: [{ emailAddress: user.email }],
    passwordEnabled: Boolean(user.passwordHash),
  }
}

export function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("hex")
  const derived = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${derived}`
}

export function verifyLocalPassword(
  password: string,
  storedHash: string | null | undefined
) {
  if (!storedHash) {
    return false
  }

  const [salt, expectedHash] = storedHash.split(":")
  if (!salt || !expectedHash) {
    return false
  }

  const derived = scryptSync(password, salt, 64)
  const expected = Buffer.from(expectedHash, "hex")

  if (derived.length !== expected.length) {
    return false
  }

  return timingSafeEqual(derived, expected)
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", getLocalAuthSecret())
    .update(payload)
    .digest("base64url")
}

function parseSessionToken(token: string | undefined | null) {
  if (!token) {
    return null
  }

  const [payload, signature] = token.split(".")
  if (!payload || !signature) {
    return null
  }

  const expectedSignature = signSessionPayload(payload)
  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as LocalSessionPayload

    if (!parsed.userId || !parsed.exp || parsed.exp <= Date.now()) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      exp: Date.now() + getSessionMaxAgeSeconds() * 1000,
    } satisfies LocalSessionPayload),
    "utf8"
  ).toString("base64url")

  return `${payload}.${signSessionPayload(payload)}`
}

async function getLocalAuthUserByToken(token: string | undefined | null) {
  if (!isSelfHostedMode()) {
    return null
  }

  const payload = parseSessionToken(token)
  if (!payload) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      clerkId: true,
      email: true,
      name: true,
      passwordHash: true,
    },
  })

  if (!user?.passwordHash) {
    return null
  }

  return toAuthUser(user)
}

export async function getLocalAuthUser() {
  const cookieStore = await cookies()
  return getLocalAuthUserByToken(
    cookieStore.get(LOCAL_AUTH_SESSION_COOKIE)?.value
  )
}

export async function getLocalAuthUserFromRequest(req: NextRequest) {
  return getLocalAuthUserByToken(req.cookies.get(LOCAL_AUTH_SESSION_COOKIE)?.value)
}

export function getLocalAuthSessionCookie(userId: string) {
  return {
    name: LOCAL_AUTH_SESSION_COOKIE,
    value: createSessionToken(userId),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  }
}

export function getClearedLocalAuthSessionCookie() {
  return {
    name: LOCAL_AUTH_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  }
}
