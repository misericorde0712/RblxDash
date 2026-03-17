import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashApiKey, isValidApiKeyFormat } from "@/lib/api-key"
import { getPlanFromSubscription } from "@/lib/stripe"
import type { Organization, User, ApiKey } from "@prisma/client"

// ─── Helpers réponse ──────────────────────────────────────────────────────────

export function apiError(
  code: string,
  message: string,
  status: number
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

export function apiSuccess(
  data: unknown,
  meta?: Record<string, unknown>
): NextResponse {
  const body: Record<string, unknown> = { data }
  if (meta) body.meta = meta
  return NextResponse.json(body, { status: 200 })
}

export function apiCreated(data: unknown): NextResponse {
  return NextResponse.json({ data }, { status: 201 })
}

// ─── Contexte d'auth ──────────────────────────────────────────────────────────

export type ApiAuthContext = {
  org: Organization
  dbUser: User
  apiKey: ApiKey
}

// ─── Middleware principal ─────────────────────────────────────────────────────

/**
 * Authentifie une requête API par clé Bearer.
 * - Vérifie le format de la clé
 * - Recherche le hash en DB
 * - Vérifie que la clé n'est pas révoquée
 * - Vérifie que l'org a un plan STUDIO actif
 * - Met à jour lastUsedAt (fire-and-forget)
 * Retourne NextResponse en cas d'erreur, ApiAuthContext en cas de succès.
 */
export async function authenticateApiRequest(
  req: NextRequest
): Promise<ApiAuthContext | NextResponse> {
  const authHeader = req.headers.get("authorization")

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return apiError(
      "UNAUTHORIZED",
      "Missing Authorization header. Use: Authorization: Bearer rd_live_...",
      401
    )
  }

  const rawKey = authHeader.slice("Bearer ".length).trim()

  if (!isValidApiKeyFormat(rawKey)) {
    return apiError("UNAUTHORIZED", "Invalid API key format.", 401)
  }

  const keyHash = hashApiKey(rawKey)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: {
      org: true,
      createdBy: true,
    },
  })

  if (!apiKey) {
    return apiError("UNAUTHORIZED", "API key not found.", 401)
  }

  if (apiKey.revokedAt) {
    return apiError("UNAUTHORIZED", "This API key has been revoked.", 401)
  }

  // Vérifier plan STUDIO
  const subscription = await prisma.subscription.findUnique({
    where: { userId: apiKey.org.billingOwnerId },
  })
  const planConfig = getPlanFromSubscription(subscription ?? null)

  if (!planConfig.apiAccess) {
    return apiError(
      "FORBIDDEN",
      "API access requires a Studio plan. Upgrade at rblxdash.com/account.",
      403
    )
  }

  // Mettre à jour lastUsedAt sans bloquer la réponse
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => null)

  return {
    org: apiKey.org,
    dbUser: apiKey.createdBy,
    apiKey,
  }
}

// ─── Helper: vérifier qu'un jeu appartient à l'org ────────────────────────────

export async function resolveGame(gameId: string, orgId: string) {
  const game = await prisma.game.findFirst({
    where: { id: gameId, orgId },
  })
  return game ?? null
}

// ─── Helper: pagination ───────────────────────────────────────────────────────

export function getPagination(searchParams: URLSearchParams, maxLimit = 100) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1)
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50)
  )
  const skip = (page - 1) * limit
  return { page, limit, skip }
}
