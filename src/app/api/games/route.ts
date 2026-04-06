import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { z } from "zod"
import { randomBytes } from "crypto"
import { createAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import {
  getCurrentGameCookie,
  getCurrentOrgCookie,
  getCurrentOrgForApi,
} from "@/lib/auth"
import { encryptOpenCloudApiKey } from "@/lib/open-cloud"
import {
  getBillingUsageSummary,
  getUnavailableModulesForPlan,
} from "@/lib/billing"

const CreateGameSchema = z.object({
  name: z.string().min(1).max(100),
  robloxPlaceId: z.string().trim().optional().default(""),
  robloxUniverseId: z.string().trim().optional(),
  openCloudApiKey: z.string().trim().optional(),
  modules: z.array(z.string()).min(1),
}).refine(
  (data) => data.robloxPlaceId || data.robloxUniverseId,
  { message: "Either Place ID or Universe ID is required", path: ["robloxPlaceId"] }
)

export async function GET() {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { org } = currentOrgResult.context

    const games = await prisma.game.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        robloxPlaceId: true,
        modules: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ games })
  } catch (err) {
    console.error("[GET /api/games]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const body = await req.json()
    const parsed = CreateGameSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, robloxPlaceId, robloxUniverseId, openCloudApiKey, modules } =
      parsed.data
    const { dbUser, org, billingOwner, billingSubscription } =
      currentOrgResult.context

    const usage = await getBillingUsageSummary({
      billingOwnerId: billingOwner.id,
      subscription: billingSubscription,
      currentOrgId: org.id,
    })

    if (!usage.canCreateGame) {
      return NextResponse.json(
        {
          error: usage.effectivePlan === "FREE"
            ? "Free plan limit reached. Open Billing to upgrade or remove an existing game before adding another."
            : `This billing account already uses ${usage.totalGamesCount} of ${usage.maxGames} game slot(s). Upgrade or remove a game before adding another.`,
        },
        { status: 403 }
      )
    }

    const unavailableModules = getUnavailableModulesForPlan({
      selectedModules: modules,
      subscription: billingSubscription,
    })

    if (unavailableModules.length > 0) {
      return NextResponse.json(
        {
          error: `Your current plan does not include: ${unavailableModules.join(", ")}.`,
        },
        { status: 403 }
      )
    }

    const webhookSecret = randomBytes(32).toString("hex")
    const robloxConnection = await prisma.robloxConnection.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    })

    if (!openCloudApiKey && !robloxConnection) {
      return NextResponse.json(
        {
          error:
            "Connect Roblox on the account page or provide an Open Cloud API key before creating a game.",
        },
        { status: 400 }
      )
    }

    const encryptedOpenCloudApiKey = openCloudApiKey
      ? encryptOpenCloudApiKey(openCloudApiKey)
      : null

    const game = await prisma.game.create({
      data: {
        name,
        robloxPlaceId,
        robloxUniverseId: robloxUniverseId || null,
        openCloudApiKey: encryptedOpenCloudApiKey,
        robloxConnectionId: robloxConnection?.id ?? null,
        modules,
        webhookSecret,
        orgId: org.id,
      },
      select: {
        id: true,
      },
    })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "game.created",
      targetType: "game",
      targetId: game.id,
      payload: {
        name,
        robloxPlaceId,
        robloxUniverseId: robloxUniverseId || null,
        modules,
        authMode: robloxConnection
          ? openCloudApiKey
            ? "oauth+open-cloud-key"
            : "oauth"
          : "open-cloud-key",
      },
    })

    const response = NextResponse.json({ game }, { status: 201 })
    response.cookies.set(getCurrentOrgCookie(org.id))
    response.cookies.set(getCurrentGameCookie(game.id))

    return response
  } catch (err) {
    console.error("[POST /api/games]", err)
    if (
      err instanceof Error &&
      err.message.includes("OPEN_CLOUD_API_KEY_ENCRYPTION_KEY")
    ) {
      return NextResponse.json(
        { error: "Server encryption key is not configured" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
