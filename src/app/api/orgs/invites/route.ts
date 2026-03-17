import { randomBytes } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { z } from "zod"
import { getCurrentOrgForApi } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  getOrgInviteExpirationDate,
  normalizeInviteEmail,
} from "@/lib/org-invites"
import { canAssignRole, canManageMembers } from "@/lib/org-members"
import { prisma } from "@/lib/prisma"
import { getRequestOrigin } from "@/lib/request-url"

const CreateInviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(OrgRole),
})

export async function POST(req: NextRequest) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { dbUser, member, org } = currentOrgResult.context

    if (!canManageMembers(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = CreateInviteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const email = normalizeInviteEmail(parsed.data.email)
    const role = parsed.data.role

    if (!canAssignRole(member.role, role)) {
      return NextResponse.json(
        { error: "You cannot invite members with that role" },
        { status: 403 }
      )
    }

    const existingMember = await prisma.orgMember.findFirst({
      where: {
        orgId: org.id,
        user: {
          email,
        },
      },
      select: {
        id: true,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: "That email already belongs to a member of this workspace" },
        { status: 409 }
      )
    }

    const token = randomBytes(24).toString("hex")
    const expiresAt = getOrgInviteExpirationDate()
    const existingInvite = await prisma.orgInvite.findFirst({
      where: {
        orgId: org.id,
        email,
        acceptedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const invite = existingInvite
      ? await prisma.orgInvite.update({
          where: {
            id: existingInvite.id,
          },
          data: {
            email,
            role,
            token,
            expiresAt,
            invitedByUserId: dbUser.id,
          },
          select: {
            id: true,
            email: true,
            role: true,
            token: true,
            expiresAt: true,
          },
        })
      : await prisma.orgInvite.create({
          data: {
            email,
            role,
            token,
            expiresAt,
            orgId: org.id,
            invitedByUserId: dbUser.id,
          },
          select: {
            id: true,
            email: true,
            role: true,
            token: true,
            expiresAt: true,
          },
        })

    const inviteUrl = `${getRequestOrigin(req)}/invite/${invite.token}`

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "member.invited",
      targetType: "invite",
      targetId: invite.id,
      payload: {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
      },
    })

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          inviteUrl,
        },
      },
      { status: existingInvite ? 200 : 201 }
    )
  } catch (err) {
    console.error("[POST /api/orgs/invites]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
