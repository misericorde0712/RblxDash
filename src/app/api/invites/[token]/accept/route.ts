import { currentUser } from "@/lib/auth-provider/server"
import { NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit-log"
import {
  getClearedCurrentGameCookie,
  getCurrentGameCookie,
  getCurrentOrgCookie,
  upsertDbUserFromClerkUser,
} from "@/lib/auth"
import { isOrgInviteExpired, normalizeInviteEmail } from "@/lib/org-invites"
import { prisma } from "@/lib/prisma"
import { toAbsoluteUrl } from "@/lib/request-url"

function getInviteRedirectUrl(req: NextRequest, token: string, reason: string) {
  const redirectUrl = toAbsoluteUrl(req, `/invite/${token}`)
  redirectUrl.searchParams.set("error", reason)
  return redirectUrl
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const clerkUser = await currentUser()
    const { token } = await params

    if (!clerkUser) {
      return NextResponse.redirect(
        toAbsoluteUrl(
          req,
          `/sign-in?redirect_url=${encodeURIComponent(`/invite/${token}`)}`,
        ),
        { status: 303 }
      )
    }

    const invite = await prisma.orgInvite.findUnique({
      where: {
        token,
      },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
        expiresAt: true,
        acceptedAt: true,
      },
    })

    if (!invite || invite.acceptedAt) {
      return NextResponse.redirect(
        getInviteRedirectUrl(req, token, "invalid"),
        { status: 303 }
      )
    }

    if (isOrgInviteExpired(invite.expiresAt)) {
      return NextResponse.redirect(
        getInviteRedirectUrl(req, token, "expired"),
        { status: 303 }
      )
    }

    const normalizedInviteEmail = normalizeInviteEmail(invite.email)
    const userEmails = clerkUser.emailAddresses.map((emailAddress) =>
      normalizeInviteEmail(emailAddress.emailAddress)
    )

    if (!userEmails.includes(normalizedInviteEmail)) {
      return NextResponse.redirect(
        getInviteRedirectUrl(req, token, "email-mismatch"),
        { status: 303 }
      )
    }

    const dbUser = await upsertDbUserFromClerkUser(clerkUser)

    await prisma.$transaction(async (tx) => {
      const existingMember = await tx.orgMember.findFirst({
        where: {
          orgId: invite.orgId,
          userId: dbUser.id,
        },
        select: {
          id: true,
        },
      })

      if (!existingMember) {
        await tx.orgMember.create({
          data: {
            orgId: invite.orgId,
            userId: dbUser.id,
            role: invite.role,
          },
        })
      }

      await tx.orgInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          acceptedAt: new Date(),
          acceptedByUserId: dbUser.id,
        },
      })

      await createAuditLog(tx, {
        orgId: invite.orgId,
        actorUserId: dbUser.id,
        event: "member.invite_accepted",
        targetType: "invite",
        targetId: invite.id,
        payload: {
          email: invite.email,
          role: invite.role,
        },
      })
    })

    const response = NextResponse.redirect(
      toAbsoluteUrl(req, "/dashboard/settings?inviteAccepted=1"),
      { status: 303 }
    )
    const firstGame = await prisma.game.findFirst({
      where: {
        orgId: invite.orgId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    })
    response.cookies.set(getCurrentOrgCookie(invite.orgId))
    if (firstGame) {
      response.cookies.set(getCurrentGameCookie(firstGame.id))
    } else {
      response.cookies.set(getClearedCurrentGameCookie())
    }

    return response
  } catch (err) {
    console.error("[POST /api/invites/[token]/accept]", err)
    return NextResponse.redirect(
      getInviteRedirectUrl(req, (await params).token, "invalid"),
      { status: 303 }
    )
  }
}
