import Link from "next/link"
import type { Metadata } from "next"
import { currentUser } from "@/lib/auth-provider/server"
import { getDbUser } from "@/lib/auth"
import { isOrgInviteExpired, normalizeInviteEmail } from "@/lib/org-invites"
import { formatOrgRole } from "@/lib/org-members"
import { prisma } from "@/lib/prisma"
import { NO_INDEX_ROBOTS } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Workspace Invite",
  description: "Private workspace invitation flow for RblxDash.",
  robots: NO_INDEX_ROBOTS,
}

function buildAuthHref(pathname: string, token: string) {
  return `${pathname}?redirect_url=${encodeURIComponent(`/invite/${token}`)}`
}

function formatDate(value: Date) {
  return value.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { token } = await params
  const resolvedSearchParams = (await searchParams) ?? {}
  const explicitError = Array.isArray(resolvedSearchParams.error)
    ? resolvedSearchParams.error[0]
    : resolvedSearchParams.error
  const invite = await prisma.orgInvite.findUnique({
    where: {
      token,
    },
    include: {
      org: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })
  const clerkUser = await currentUser()
  const dbUser = clerkUser ? await getDbUser(clerkUser) : null
  const existingMembership =
    invite && dbUser
      ? await prisma.orgMember.findFirst({
          where: {
            orgId: invite.orgId,
            userId: dbUser.id,
          },
          select: {
            role: true,
          },
        })
      : null
  const inviteEmail = invite ? normalizeInviteEmail(invite.email) : null
  const userMatchesInvite =
    inviteEmail && clerkUser
      ? clerkUser.emailAddresses.some(
          (emailAddress) =>
            normalizeInviteEmail(emailAddress.emailAddress) === inviteEmail
        )
      : false

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-400">
            Workspace Invite
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">
            Join {invite?.org.name ?? "RblxDash"}
          </h1>
        </div>

        {!invite || invite.acceptedAt || explicitError === "invalid" ? (
          <div className="rounded-xl border border-red-900 bg-red-950/60 px-4 py-4 text-sm text-red-200">
            This invite is no longer valid. Ask a workspace owner or admin to create a new one.
          </div>
        ) : isOrgInviteExpired(invite.expiresAt) || explicitError === "expired" ? (
          <div className="rounded-xl border border-yellow-900 bg-yellow-950/60 px-4 py-4 text-sm text-yellow-200">
            This invite expired on {formatDate(invite.expiresAt)}. Ask the team for a fresh link.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-gray-800 bg-gray-950/70 p-5">
              <div className="grid gap-4 text-sm text-gray-300 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Workspace
                  </p>
                  <p className="mt-1 text-white">{invite.org.name}</p>
                  <p className="text-gray-500">{invite.org.slug}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </p>
                  <p className="mt-1 text-white">{formatOrgRole(invite.role)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invited email
                  </p>
                  <p className="mt-1 text-white">{invite.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Expires
                  </p>
                  <p className="mt-1 text-white">{formatDate(invite.expiresAt)}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-gray-400">
                Invited by {invite.invitedBy.name ?? invite.invitedBy.email}.
              </p>
            </div>

            {existingMembership ? (
              <div className="mt-6 rounded-xl border border-blue-900 bg-blue-950/60 px-4 py-4 text-sm text-blue-200">
                You already have access to this workspace as{" "}
                {formatOrgRole(existingMembership.role)}.
                <div className="mt-4">
                  <Link
                    href="/dashboard/settings"
                    className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Open dashboard
                  </Link>
                </div>
              </div>
            ) : !clerkUser ? (
              <div className="mt-6 space-y-4">
                <p className="text-sm text-gray-300">
                  Sign in or create an account with <span className="font-medium text-white">{invite.email}</span> to accept this workspace invite.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={buildAuthHref("/sign-in", token)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                  >
                    Sign in
                  </Link>
                  <Link
                    href={buildAuthHref("/sign-up", token)}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:bg-gray-800"
                  >
                    Create account
                  </Link>
                </div>
              </div>
            ) : !userMatchesInvite || explicitError === "email-mismatch" ? (
              <div className="mt-6 rounded-xl border border-yellow-900 bg-yellow-950/60 px-4 py-4 text-sm text-yellow-200">
                You are signed in with a different email. Switch to{" "}
                <span className="font-medium text-yellow-100">{invite.email}</span> before accepting this invite.
              </div>
            ) : (
              <form
                action={`/api/invites/${token}/accept`}
                method="POST"
                className="mt-6"
              >
                <button
                  type="submit"
                  className="inline-flex rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  Accept invite
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
