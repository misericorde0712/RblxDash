import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { getCurrentOrgCookie, getDbUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import { getOwnedOrganizationSummary } from "@/lib/stripe"
import { sendWelcomeEmail } from "@/lib/email"

class OrganizationLimitError extends Error {
  maxOrganizations: number
  requiresPlan: boolean

  constructor(maxOrganizations: number, requiresPlan = false) {
    super("ORGANIZATION_LIMIT_REACHED")
    this.maxOrganizations = maxOrganizations
    this.requiresPlan = requiresPlan
  }
}

const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
})

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const parsed = CreateOrgSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const { name, slug } = parsed.data

    const dbUser = await getDbUser(clerkUser)
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { error: "This slug is already taken" },
        { status: 409 }
      )
    }

    // Create org and attach it to the current account billing owner
    const org = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const ownedOrganizationsCount = await tx.orgMember.count({
        where: {
          userId: dbUser.id,
          role: "OWNER",
        },
      })
      const accountSubscription = await tx.subscription.findUnique({
        where: { userId: dbUser.id },
      })
      const ownedOrganizationSummary = getOwnedOrganizationSummary({
        ownedOrganizationsCount,
        subscription: accountSubscription,
      })

      if (!ownedOrganizationSummary.canCreateOrganization) {
        throw new OrganizationLimitError(
          ownedOrganizationSummary.maxOrganizations,
          !ownedOrganizationSummary.hasActivePlan
        )
      }

      const newOrg = await tx.organization.create({
        data: {
          name,
          slug,
          billingOwnerId: dbUser.id,
        },
      })

      await tx.orgMember.create({
        data: {
          userId: dbUser.id,
          orgId: newOrg.id,
          role: "OWNER",
        },
      })

      await tx.subscription.upsert({
        where: { userId: dbUser.id },
        update: {},
        create: {
          userId: dbUser.id,
          plan: "FREE",
          status: "CANCELED",
          // Placeholder Stripe customer ID — replaced when Stripe customer is created
          stripeCustomerId: `placeholder_${dbUser.id}`,
        },
      })

      await createAuditLog(tx, {
        orgId: newOrg.id,
        actorUserId: dbUser.id,
        event: "workspace.created",
        targetType: "workspace",
        targetId: newOrg.id,
        payload: {
          name: newOrg.name,
          slug: newOrg.slug,
        },
      })

      return newOrg
    })

    // Envoyer l'email de bienvenue uniquement pour le tout premier workspace
    const ownedOrgsCount = await prisma.orgMember.count({
      where: { userId: dbUser.id, role: "OWNER" },
    })
    if (ownedOrgsCount === 1) {
      sendWelcomeEmail({ to: dbUser.email, name: dbUser.name ?? "" }).catch(() => null)
    }

    const response = NextResponse.json({ org }, { status: 201 })
    response.cookies.set(getCurrentOrgCookie(org.id))

    return response
  } catch (err) {
    if (err instanceof OrganizationLimitError) {
      return NextResponse.json(
        {
          error: err.requiresPlan
            ? "Open Account and start checkout before creating another workspace."
            : `Your account plan allows a maximum of ${err.maxOrganizations} owned workspace(s). Upgrade your account before creating another.`,
        },
        { status: 403 }
      )
    }

    console.error("[POST /api/orgs]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
