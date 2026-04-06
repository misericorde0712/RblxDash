import { currentUser } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getCurrentGameCookie,
  getCurrentOrgCookie,
  getDbUser,
} from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { toAbsoluteUrl } from "@/lib/request-url"

const UpdateCurrentGameSchema = z.object({
  gameId: z.string().min(1),
  redirectTo: z.string().startsWith("/dashboard").optional(),
})

function getSafeRedirectTo(value: string | undefined) {
  if (!value?.startsWith("/dashboard")) {
    return "/dashboard"
  }

  return value
}

async function resolveAuthenticatedUser() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return { error: "UNAUTHENTICATED" as const }
  }

  const dbUser = await getDbUser(clerkUser)
  if (!dbUser) {
    return { error: "USER_NOT_FOUND" as const }
  }

  return { dbUser }
}

async function resolveGameForUser(gameId: string, dbUserId: string) {
  return prisma.game.findFirst({
    where: {
      id: gameId,
      org: {
        members: {
          some: {
            userId: dbUserId,
          },
        },
      },
    },
    select: {
      id: true,
      orgId: true,
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    const authenticated = await resolveAuthenticatedUser()
    if ("error" in authenticated) {
      const redirectTarget =
        authenticated.error === "UNAUTHENTICATED" ? "/sign-in" : "/onboarding"

      return NextResponse.redirect(toAbsoluteUrl(req, redirectTarget), {
        status: 303,
      })
    }

    const parsed = UpdateCurrentGameSchema.safeParse({
      gameId: req.nextUrl.searchParams.get("gameId"),
      redirectTo: req.nextUrl.searchParams.get("redirectTo") ?? undefined,
    })

    if (!parsed.success) {
      return NextResponse.redirect(toAbsoluteUrl(req, "/dashboard/games"), {
        status: 303,
      })
    }

    const game = await resolveGameForUser(parsed.data.gameId, authenticated.dbUser.id)
    if (!game) {
      return NextResponse.redirect(toAbsoluteUrl(req, "/dashboard/games"), {
        status: 303,
      })
    }

    const redirectTo = getSafeRedirectTo(parsed.data.redirectTo)
    const response = NextResponse.redirect(toAbsoluteUrl(req, redirectTo), {
      status: 303,
    })
    response.cookies.set(getCurrentOrgCookie(game.orgId))
    response.cookies.set(getCurrentGameCookie(game.id))

    return response
  } catch (err) {
    console.error("[GET /api/games/current]", err)
    return NextResponse.redirect(toAbsoluteUrl(req, "/dashboard/games"), {
      status: 303,
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authenticated = await resolveAuthenticatedUser()
    if ("error" in authenticated) {
      if (authenticated.error === "UNAUTHENTICATED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      return NextResponse.json(
        { error: "Complete onboarding before switching games" },
        { status: 409 }
      )
    }

    const contentType = req.headers.get("content-type") ?? ""
    const isJsonRequest = contentType.includes("application/json")
    const rawBody = isJsonRequest
      ? await req.json()
      : Object.fromEntries(await req.formData())
    const parsed = UpdateCurrentGameSchema.safeParse(rawBody)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      )
    }

    const game = await resolveGameForUser(parsed.data.gameId, authenticated.dbUser.id)

    if (!game) {
      return NextResponse.json(
        { error: "Game not found for this account" },
        { status: 404 }
      )
    }

    const redirectTo = getSafeRedirectTo(parsed.data.redirectTo)
    const response = isJsonRequest
      ? NextResponse.json(
          {
            ok: true,
            redirectTo,
          },
          { status: 200 }
        )
      : NextResponse.redirect(toAbsoluteUrl(req, redirectTo), { status: 303 })
    response.cookies.set(getCurrentOrgCookie(game.orgId))
    response.cookies.set(getCurrentGameCookie(game.id))

    return response
  } catch (err) {
    console.error("[POST /api/games/current]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
