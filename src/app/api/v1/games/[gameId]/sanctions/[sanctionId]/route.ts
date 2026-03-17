import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, resolveGame } from "@/lib/api-auth"

// GET /api/v1/games/:gameId/sanctions/:sanctionId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; sanctionId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId, sanctionId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const sanction = await prisma.sanction.findFirst({
    where: { id: sanctionId, gameId },
  })
  if (!sanction) return apiError("NOT_FOUND", "Sanction not found.", 404)

  return apiSuccess({
    id: sanction.id,
    type: sanction.type,
    reason: sanction.reason,
    active: sanction.active,
    roblox_id: sanction.robloxId,
    expires_at: sanction.expiresAt,
    delivery_status: sanction.deliveryStatus,
    delivered_at: sanction.deliveredAt,
    delivery_details: sanction.deliveryDetails,
    moderator: sanction.moderator,
    created_at: sanction.createdAt,
    updated_at: sanction.updatedAt,
  })
}

// DELETE /api/v1/games/:gameId/sanctions/:sanctionId — révoquer
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; sanctionId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId, sanctionId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const sanction = await prisma.sanction.findFirst({
    where: { id: sanctionId, gameId },
  })
  if (!sanction) return apiError("NOT_FOUND", "Sanction not found.", 404)
  if (!sanction.active) return apiError("BAD_REQUEST", "Sanction is already inactive.", 400)

  await prisma.sanction.update({
    where: { id: sanctionId },
    data: { active: false },
  })

  return apiSuccess({ id: sanctionId, revoked: true })
}
