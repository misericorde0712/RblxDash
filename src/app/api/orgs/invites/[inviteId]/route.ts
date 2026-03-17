import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForApi } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import { canAssignRole, canManageMembers } from "@/lib/org-members"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { inviteId } = await params
    const { dbUser, member, org } = currentOrgResult.context

    if (!canManageMembers(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const invite = await prisma.orgInvite.findFirst({
      where: {
        id: inviteId,
        orgId: org.id,
        acceptedAt: null,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found" },
        { status: 404 }
      )
    }

    if (!canAssignRole(member.role, invite.role)) {
      return NextResponse.json(
        { error: "You cannot revoke invites for that role" },
        { status: 403 }
      )
    }

    await prisma.orgInvite.delete({
      where: {
        id: invite.id,
      },
    })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "member.invite_revoked",
      targetType: "invite",
      targetId: invite.id,
      payload: {
        email: invite.email,
        role: invite.role,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/orgs/invites/[inviteId]]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
