import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import {
  getClearedCurrentGameCookie,
  getClearedCurrentOrgCookie,
  getCurrentGameCookie,
  getCurrentOrgCookie,
  getDbUser,
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function getSafeRedirectTo(value: string | null) {
  if (value === "/onboarding") {
    return value
  }

  if (!value?.startsWith("/dashboard")) {
    return "/dashboard/settings"
  }

  return value
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getDbUser(clerkUser)
    if (!dbUser) {
      return NextResponse.json(
        { error: "Complete onboarding before deleting organizations" },
        { status: 409 }
      )
    }

    const { orgId } = await params
    const membership = await prisma.orgMember.findFirst({
      where: {
        orgId,
        userId: dbUser.id,
      },
      select: {
        role: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found for this account" },
        { status: 404 }
      )
    }

    if (membership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only workspace owners can delete an organization" },
        { status: 403 }
      )
    }

    const currentOrgId = req.cookies.get("rblxdash_current_org_id")?.value ?? null

    await prisma.organization.delete({
      where: {
        id: orgId,
      },
    })

    const remainingMemberships = await prisma.orgMember.findMany({
      where: {
        userId: dbUser.id,
      },
      select: {
        orgId: true,
      },
      orderBy: {
        joinedAt: "asc",
      },
    })
    const nextOrgId =
      currentOrgId && currentOrgId !== orgId
        ? remainingMemberships.find(
            (remainingMembership) => remainingMembership.orgId === currentOrgId
          )?.orgId ?? remainingMemberships[0]?.orgId
        : remainingMemberships[0]?.orgId

    const preferredRedirect =
      nextOrgId ? "/dashboard/settings?deleted=1" : "/onboarding"
    const redirectTo = getSafeRedirectTo(preferredRedirect)
    const response = NextResponse.json(
      {
        ok: true,
        redirectTo,
      },
      { status: 200 }
    )

    if (nextOrgId) {
      const currentGameId = req.cookies.get("rblxdash_current_game_id")?.value ?? null
      const nextGame =
        (currentGameId
          ? await prisma.game.findFirst({
              where: {
                id: currentGameId,
                orgId: nextOrgId,
              },
              select: {
                id: true,
              },
            })
          : null) ??
        (await prisma.game.findFirst({
          where: {
            orgId: nextOrgId,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
          },
        }))
      response.cookies.set(getCurrentOrgCookie(nextOrgId))
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
    console.error("[DELETE /api/orgs/[orgId]]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
