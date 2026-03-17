import { NextRequest, NextResponse } from "next/server"
import { OrgRole, Prisma } from "@prisma/client"
import { z } from "zod"
import { createAuditLog } from "@/lib/audit-log"
import { getCurrentOrgForApi } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TransferOwnershipSchema = z.object({
  memberId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.OWNER)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { dbUser, org } = currentOrgResult.context
    const body = await req.json()
    const parsed = TransferOwnershipSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const targetMember = await prisma.orgMember.findFirst({
      where: {
        id: parsed.data.memberId,
        orgId: org.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      )
    }

    if (targetMember.userId === dbUser.id) {
      return NextResponse.json(
        { error: "Select another member to transfer ownership" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.orgMember.update({
        where: {
          id: targetMember.id,
        },
        data: {
          role: "OWNER",
        },
      })

      await tx.organization.update({
        where: {
          id: org.id,
        },
        data: {
          billingOwnerId: targetMember.userId,
        },
      })

      await tx.subscription.upsert({
        where: {
          userId: targetMember.userId,
        },
        update: {},
        create: {
          userId: targetMember.userId,
          plan: "FREE",
          status: "CANCELED",
          stripeCustomerId: `placeholder_${targetMember.userId}`,
        },
      })

      await createAuditLog(tx, {
        orgId: org.id,
        actorUserId: dbUser.id,
        event: "workspace.ownership_transferred",
        targetType: "workspace",
        targetId: org.id,
        payload: {
          fromUserId: dbUser.id,
          toUserId: targetMember.userId,
          toEmail: targetMember.user.email,
          toName: targetMember.user.name,
        },
      })
    })

    return NextResponse.json(
      {
        ok: true,
        member: {
          id: targetMember.id,
          role: "OWNER",
          userId: targetMember.userId,
          email: targetMember.user.email,
          name: targetMember.user.name,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error("[POST /api/orgs/current/transfer-ownership]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
