import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getClearedCurrentGameCookie,
  getCurrentGameCookie,
  getCurrentOrgCookie,
  getDbUser,
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const UpdateCurrentOrgSchema = z.object({
  orgId: z.string().min(1),
  redirectTo: z.string().startsWith("/dashboard").optional(),
})

function getSafeRedirectTo(value: string | undefined) {
  if (!value?.startsWith("/dashboard")) {
    return "/dashboard"
  }

  return value
}

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getDbUser(clerkUser)
    if (!dbUser) {
      return NextResponse.json(
        { error: "Complete onboarding before switching organizations" },
        { status: 409 }
      )
    }

    const contentType = req.headers.get("content-type") ?? ""
    const isJsonRequest = contentType.includes("application/json")
    const rawBody = isJsonRequest
      ? await req.json()
      : Object.fromEntries(await req.formData())
    const parsed = UpdateCurrentOrgSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const membership = await prisma.orgMember.findFirst({
      where: {
        userId: dbUser.id,
        orgId: parsed.data.orgId,
      },
      select: {
        orgId: true,
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Organization not found for this account" },
        { status: 404 }
      )
    }

    const redirectTo = getSafeRedirectTo(parsed.data.redirectTo)
    const firstGame = await prisma.game.findFirst({
      where: {
        orgId: membership.orgId,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    })
    const response = isJsonRequest
      ? NextResponse.json(
          {
            ok: true,
            redirectTo,
          },
          { status: 200 }
        )
      : NextResponse.redirect(new URL(redirectTo, req.url), { status: 303 })
    response.cookies.set(getCurrentOrgCookie(membership.orgId))
    if (firstGame) {
      response.cookies.set(getCurrentGameCookie(firstGame.id))
    } else {
      response.cookies.set(getClearedCurrentGameCookie())
    }

    return response
  } catch (err) {
    console.error("[POST /api/orgs/current]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
