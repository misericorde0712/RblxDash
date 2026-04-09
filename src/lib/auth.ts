import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { currentUser } from "@/lib/auth-provider/server"
import { prisma } from "@/lib/prisma"
import type { User, OrgMember, Organization, Subscription, Plan } from "@prisma/client"
import { OrgRole } from "@prisma/client"
import { hasRequiredRole } from "@/lib/org-members"

export { hasRequiredRole }

type AuthenticatedUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>
type MembershipWithOrg = OrgMember & {
  org: Organization & {
    billingOwner: User & {
      subscription: Subscription | null
    }
  }
}

export const CURRENT_ORG_COOKIE_NAME = "rblxdash_current_org_id"
const CURRENT_ORG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
export const CURRENT_GAME_COOKIE_NAME = "rblxdash_current_game_id"

type CurrentOrgErrorCode =
  | "UNAUTHENTICATED"
  | "USER_NOT_FOUND"
  | "NO_ORG"
  | "FORBIDDEN"

class CurrentOrgError extends Error {
  code: CurrentOrgErrorCode
  redirectTo?: string

  constructor(code: CurrentOrgErrorCode, redirectTo?: string) {
    super(code)
    this.code = code
    this.redirectTo = redirectTo
  }
}

export type AvailableOrg = {
  id: string
  name: string
  slug: string
  role: OrgRole
  joinedAt: Date
  billingOwnerId: string
  billingPlan: Plan | null
  billingPlanCreatedAt: Date | null
}

export type AvailableGame = {
  id: string
  name: string
  orgId: string
  orgName: string
  orgSlug: string
  role: OrgRole
  createdAt: Date
}

export type CurrentOrgContext = {
  clerkUser: AuthenticatedUser
  dbUser: User
  member: OrgMember
  org: Organization
  billingOwner: User
  billingSubscription: Subscription | null
  accountSubscription: Subscription | null
  isBillingOwner: boolean
  availableOrgs: AvailableOrg[]
  currentGame: AvailableGame | null
  availableGames: AvailableGame[]
}

/**
 * Find the DB User row for the given Clerk ID.
 * When passed a full Clerk user, also repairs dev -> prod Clerk ID migrations.
 */
function getPrimaryEmailAddress(clerkUser: AuthenticatedUser) {
  return clerkUser.emailAddresses[0]?.emailAddress ?? ""
}

function getDisplayName(clerkUser: AuthenticatedUser) {
  return clerkUser.fullName ?? clerkUser.username ?? null
}

export async function getDbUser(
  clerkUserOrId: string | AuthenticatedUser
): Promise<User | null> {
  if (typeof clerkUserOrId === "string") {
    return prisma.user.findUnique({ where: { clerkId: clerkUserOrId } })
  }

  return upsertDbUserFromClerkUser(clerkUserOrId)
}

export async function upsertDbUserFromClerkUser(
  clerkUser: AuthenticatedUser
): Promise<User> {
  const email = getPrimaryEmailAddress(clerkUser)
  const name = getDisplayName(clerkUser)

  return prisma.$transaction(async (tx) => {
    const existingByClerkId = await tx.user.findUnique({
      where: { clerkId: clerkUser.id },
    })

    if (existingByClerkId) {
      let nextEmail = existingByClerkId.email

      if (email && email !== existingByClerkId.email) {
        const existingByEmail = await tx.user.findUnique({
          where: { email },
        })

        if (!existingByEmail || existingByEmail.id === existingByClerkId.id) {
          nextEmail = email
        }
      }

      if (
        nextEmail === existingByClerkId.email &&
        name === existingByClerkId.name
      ) {
        return existingByClerkId
      }

      return tx.user.update({
        where: { id: existingByClerkId.id },
        data: {
          email: nextEmail,
          name,
        },
      })
    }

    if (email) {
      const existingByEmail = await tx.user.findUnique({
        where: { email },
      })

      if (existingByEmail) {
        return tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            clerkId: clerkUser.id,
            email,
            name,
          },
        })
      }
    }

    return tx.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        name,
      },
    })
  })
}

async function getAuthenticatedClerkUser(): Promise<AuthenticatedUser> {
  const clerkUser = await currentUser()
  if (!clerkUser) {
    throw new CurrentOrgError("UNAUTHENTICATED", "/sign-in")
  }

  return clerkUser
}

/**
 * Returns the authenticated Clerk user or redirects to /sign-in.
 * Safe to call from Server Components and Route Handlers.
 */
export async function requireAuth() {
  try {
    return await getAuthenticatedClerkUser()
  } catch (error) {
    if (error instanceof CurrentOrgError && error.redirectTo) {
      redirect(error.redirectTo)
    }

    throw error
  }
}

function mapAvailableOrg(membership: MembershipWithOrg): AvailableOrg {
  return {
    id: membership.org.id,
    name: membership.org.name,
    slug: membership.org.slug,
    role: membership.role,
    joinedAt: membership.joinedAt,
    billingOwnerId: membership.org.billingOwnerId,
    billingPlan: membership.org.billingOwner.subscription?.plan ?? null,
    billingPlanCreatedAt: membership.org.billingOwner.subscription?.createdAt ?? null,
  }
}

async function getPreferredOrgId() {
  const cookieStore = await cookies()
  return cookieStore.get(CURRENT_ORG_COOKIE_NAME)?.value ?? null
}

async function getPreferredGameId() {
  const cookieStore = await cookies()
  return cookieStore.get(CURRENT_GAME_COOKIE_NAME)?.value ?? null
}

async function getMembershipsForUser(
  userId: string
): Promise<MembershipWithOrg[]> {
  return prisma.orgMember.findMany({
    where: { userId },
    include: {
      org: {
        include: {
          billingOwner: {
            include: {
              subscription: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  })
}

async function getAvailableGamesForMemberships(
  memberships: MembershipWithOrg[]
): Promise<AvailableGame[]> {
  const orgIds = memberships.map((membership) => membership.orgId)

  if (orgIds.length === 0) {
    return []
  }

  const roleByOrgId = new Map(
    memberships.map((membership) => [membership.orgId, membership.role])
  )
  const games = await prisma.game.findMany({
    where: {
      orgId: {
        in: orgIds,
      },
    },
    select: {
      id: true,
      name: true,
      orgId: true,
      createdAt: true,
      org: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: [
      {
        createdAt: "asc",
      },
    ],
  })

  return games.map((game) => ({
    id: game.id,
    name: game.name,
    orgId: game.orgId,
    orgName: game.org.name,
    orgSlug: game.org.slug,
    role: roleByOrgId.get(game.orgId) ?? OrgRole.MODERATOR,
    createdAt: game.createdAt,
  }))
}

export function getCurrentOrgCookie(orgId: string) {
  return {
    name: CURRENT_ORG_COOKIE_NAME,
    value: orgId,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CURRENT_ORG_COOKIE_MAX_AGE,
  }
}

export function getClearedCurrentOrgCookie() {
  return {
    name: CURRENT_ORG_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  }
}

export function getCurrentGameCookie(gameId: string) {
  return {
    name: CURRENT_GAME_COOKIE_NAME,
    value: gameId,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CURRENT_ORG_COOKIE_MAX_AGE,
  }
}

export function getClearedCurrentGameCookie() {
  return {
    name: CURRENT_GAME_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  }
}

export async function getCurrentOrg(
  minRole: OrgRole = OrgRole.MODERATOR
): Promise<CurrentOrgContext> {
  const clerkUser = await getAuthenticatedClerkUser()

  const dbUser = await getDbUser(clerkUser)

  if (!dbUser) {
    throw new CurrentOrgError("USER_NOT_FOUND", "/onboarding")
  }

  const preferredOrgId = await getPreferredOrgId()
  const preferredGameId = await getPreferredGameId()
  const memberships = await getMembershipsForUser(dbUser.id)
  const availableGames = await getAvailableGamesForMemberships(memberships)
  const accountSubscription = await prisma.subscription.findUnique({
    where: { userId: dbUser.id },
  })

  if (memberships.length === 0) {
    throw new CurrentOrgError("NO_ORG", "/onboarding")
  }

  const preferredGame =
    availableGames.find((candidate) => candidate.id === preferredGameId) ?? null
  const membership =
    (preferredGame
      ? memberships.find((candidate) => candidate.orgId === preferredGame.orgId)
      : null) ??
    memberships.find((candidate) => candidate.orgId === preferredOrgId) ??
    memberships[0]

  if (!hasRequiredRole(membership.role, minRole)) {
    throw new CurrentOrgError("FORBIDDEN")
  }

  const { billingOwner } = membership.org
  const currentGame =
    (preferredGame && preferredGame.orgId === membership.orgId
      ? preferredGame
      : null) ??
    availableGames.find((candidate) => candidate.orgId === membership.orgId) ??
    null

  return {
    clerkUser,
    dbUser,
    member: {
      id: membership.id,
      role: membership.role,
      joinedAt: membership.joinedAt,
      userId: membership.userId,
      orgId: membership.orgId,
    },
    org: {
      id: membership.org.id,
      name: membership.org.name,
      slug: membership.org.slug,
      createdAt: membership.org.createdAt,
      billingOwnerId: membership.org.billingOwnerId,
      discordWebhookUrl: membership.org.discordWebhookUrl,
    },
    billingOwner,
    billingSubscription: billingOwner.subscription,
    accountSubscription,
    isBillingOwner: billingOwner.id === dbUser.id,
    availableOrgs: memberships.map(mapAvailableOrg),
    currentGame,
    availableGames,
  }
}

export async function requireCurrentOrg(
  minRole: OrgRole = OrgRole.MODERATOR
): Promise<CurrentOrgContext> {
  try {
    return await getCurrentOrg(minRole)
  } catch (error) {
    if (error instanceof CurrentOrgError && error.redirectTo) {
      redirect(error.redirectTo)
    }

    throw error
  }
}

export async function getCurrentOrgForRoute(
  req: NextRequest,
  minRole: OrgRole = OrgRole.MODERATOR
): Promise<
  | { context: CurrentOrgContext }
  | { response: NextResponse<{ error: string }> | NextResponse<unknown> }
> {
  try {
    return {
      context: await getCurrentOrg(minRole),
    }
  } catch (error) {
    if (error instanceof CurrentOrgError) {
      if (error.code === "FORBIDDEN") {
        return {
          response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
        }
      }

      const redirectTo = error.redirectTo ?? "/sign-in"
      return {
        response: NextResponse.redirect(new URL(redirectTo, req.url), {
          status: 303,
        }),
      }
    }

    throw error
  }
}

export async function getCurrentOrgForApi(
  minRole: OrgRole = OrgRole.MODERATOR
): Promise<
  | { context: CurrentOrgContext }
  | { response: NextResponse<{ error: string }> }
> {
  try {
    return {
      context: await getCurrentOrg(minRole),
    }
  } catch (error) {
    if (error instanceof CurrentOrgError) {
      switch (error.code) {
        case "UNAUTHENTICATED":
          return {
            response: NextResponse.json(
              { error: "Unauthorized" },
              { status: 401 }
            ),
          }
        case "USER_NOT_FOUND":
        case "NO_ORG":
          return {
            response: NextResponse.json(
              { error: "Create an organization before continuing" },
              { status: 409 }
            ),
          }
        case "FORBIDDEN":
          return {
            response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
          }
      }
    }

    throw error
  }
}

/**
 * Verifies the current user is a member of `orgSlug` with at least `minRole`.
 * Redirects to /sign-in if unauthenticated, throws if unauthorized.
 */
export async function requireOrgMember(
  orgSlug: string,
  minRole: OrgRole = OrgRole.MODERATOR
): Promise<{ dbUser: User; member: OrgMember }> {
  const clerkUser = await requireAuth()

  const dbUser = await getDbUser(clerkUser)

  if (!dbUser) redirect("/onboarding")

  const member = await prisma.orgMember.findFirst({
    where: {
      userId: dbUser.id,
      org: { slug: orgSlug },
    },
  })

  if (!member) {
    throw new Error("Not a member of this organization")
  }

  if (!hasRequiredRole(member.role, minRole)) {
    throw new Error(
      `Insufficient permissions: requires ${minRole}, has ${member.role}`
    )
  }

  return { dbUser, member }
}
