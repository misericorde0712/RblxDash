import { NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit-log"
import {
  getClearedCurrentGameCookie,
  getClearedCurrentOrgCookie,
  getCurrentGameCookie,
  getCurrentOrgCookie,
  getCurrentOrgForApi,
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
  try {
    const currentOrgResult = await getCurrentOrgForApi()
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { dbUser, member, org, isBillingOwner } = currentOrgResult.context

    if (member.role === "OWNER") {
      if (isBillingOwner) {
        return NextResponse.json(
          {
            error:
              "Transfer ownership and billing responsibility before leaving this workspace.",
          },
          { status: 409 }
        )
      }

      const ownersCount = await prisma.orgMember.count({
        where: {
          orgId: org.id,
          role: "OWNER",
        },
      })

      if (ownersCount <= 1) {
        return NextResponse.json(
          {
            error:
              "Promote another owner before leaving this workspace.",
          },
          { status: 409 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await createAuditLog(tx, {
        orgId: org.id,
        actorUserId: dbUser.id,
        event: "workspace.left",
        targetType: "member",
        targetId: member.id,
        payload: {
          role: member.role,
        },
      })

      await tx.orgMember.delete({
        where: {
          id: member.id,
        },
      })
    })

    const nextMembership = await prisma.orgMember.findFirst({
      where: {
        userId: dbUser.id,
      },
      orderBy: {
        joinedAt: "asc",
      },
      select: {
        orgId: true,
      },
    })

    const redirectTo = nextMembership?.orgId
      ? "/dashboard/settings?left=1"
      : "/onboarding"
    const response = NextResponse.json(
      {
        ok: true,
        redirectTo,
      },
      { status: 200 }
    )

    if (nextMembership?.orgId) {
      const nextGame = await prisma.game.findFirst({
        where: {
          orgId: nextMembership.orgId,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
        },
      })
      response.cookies.set(getCurrentOrgCookie(nextMembership.orgId))
      if (nextGame) {
        response.cookies.set(getCurrentGameCookie(nextGame.id))
      } else {
        response.cookies.set(getClearedCurrentGameCookie())
      }
    } else {
      response.cookies.set(getClearedCurrentOrgCookie())
      response.cookies.set(getClearedCurrentGameCookie())
    }

    return response
  } catch (err) {
    console.error("[POST /api/orgs/current/leave]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
