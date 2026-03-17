import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { z } from "zod"
import { getCurrentOrgForApi } from "@/lib/auth"
import { createAuditLog } from "@/lib/audit-log"
import {
  canAssignRole,
  canManageMembers,
  canManageTargetRole,
} from "@/lib/org-members"
import { prisma } from "@/lib/prisma"

const UpdateMemberSchema = z.object({
  role: z.nativeEnum(OrgRole),
})

async function countOwnersForOrg(orgId: string) {
  return prisma.orgMember.count({
    where: {
      orgId,
      role: "OWNER",
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { memberId } = await params
    const { dbUser, member, org } = currentOrgResult.context

    if (!canManageMembers(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const parsed = UpdateMemberSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const targetMember = await prisma.orgMember.findFirst({
      where: {
        id: memberId,
        orgId: org.id,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
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
        { error: "Use another owner to change your own role" },
        { status: 400 }
      )
    }

    if (
      !canManageTargetRole(member.role, targetMember.role) ||
      !canAssignRole(member.role, parsed.data.role)
    ) {
      return NextResponse.json(
        { error: "You cannot update this member role" },
        { status: 403 }
      )
    }

    if (targetMember.role === "OWNER" && parsed.data.role !== "OWNER") {
      const ownersCount = await countOwnersForOrg(org.id)
      if (ownersCount <= 1) {
        return NextResponse.json(
          { error: "Every workspace must keep at least one owner" },
          { status: 409 }
        )
      }
    }

    const updatedMember = await prisma.orgMember.update({
      where: {
        id: targetMember.id,
      },
      data: {
        role: parsed.data.role,
      },
      select: {
        id: true,
        role: true,
      },
    })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "member.role_changed",
      targetType: "member",
      targetId: targetMember.id,
      payload: {
        email: targetMember.user.email,
        name: targetMember.user.name,
        fromRole: targetMember.role,
        toRole: updatedMember.role,
      },
    })

    return NextResponse.json({ member: updatedMember })
  } catch (err) {
    console.error("[PATCH /api/orgs/members/[memberId]]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const currentOrgResult = await getCurrentOrgForApi(OrgRole.ADMIN)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { memberId } = await params
    const { dbUser, member, org } = currentOrgResult.context

    if (!canManageMembers(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const targetMember = await prisma.orgMember.findFirst({
      where: {
        id: memberId,
        orgId: org.id,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        user: {
          select: {
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
        { error: "Use another owner to remove your own access" },
        { status: 400 }
      )
    }

    if (!canManageTargetRole(member.role, targetMember.role)) {
      return NextResponse.json(
        { error: "You cannot remove this member" },
        { status: 403 }
      )
    }

    if (targetMember.role === "OWNER") {
      const ownersCount = await countOwnersForOrg(org.id)
      if (ownersCount <= 1) {
        return NextResponse.json(
          { error: "Every workspace must keep at least one owner" },
          { status: 409 }
        )
      }
    }

    await prisma.orgMember.delete({
      where: {
        id: targetMember.id,
      },
    })

    await createAuditLog(prisma, {
      orgId: org.id,
      actorUserId: dbUser.id,
      event: "member.removed",
      targetType: "member",
      targetId: targetMember.id,
      payload: {
        email: targetMember.user.email,
        name: targetMember.user.name,
        role: targetMember.role,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[DELETE /api/orgs/members/[memberId]]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
