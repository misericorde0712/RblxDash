import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { requireCurrentOrg } from "@/lib/auth"
import { getBillingUsageSummary } from "@/lib/billing"
import CreateOrganizationForm from "@/components/create-organization-form"
import { canManageMembers, formatOrgRole } from "@/lib/org-members"
import { getOwnedOrganizationSummary, getPlanState, getPlanFromSubscription } from "@/lib/stripe"
import DeleteOrganizationButton from "./delete-organization-button"
import ApiKeysCard from "./api-keys-card"
import NotificationsCard from "./notifications-card"
import PermissionsMatrixCard from "./permissions-matrix-card"
import TeamManagementCard from "./team-management-card"

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { dbUser, member, org, availableOrgs, accountSubscription, billingSubscription } =
    await requireCurrentOrg()
  const canManageTeam = canManageMembers(member.role)
  const ownedOrganizationSummary = getOwnedOrganizationSummary({
    ownedOrganizationsCount: availableOrgs.filter(
      (organization) => organization.role === "OWNER"
    ).length,
    subscription: accountSubscription,
  })
  const canCreateOrganization = ownedOrganizationSummary.canCreateOrganization
  const ownedWorkspaceLimit = Number.isFinite(
    ownedOrganizationSummary.maxOrganizations
  )
    ? `${ownedOrganizationSummary.ownedOrganizationsCount} / ${ownedOrganizationSummary.maxOrganizations}`
    : `${ownedOrganizationSummary.ownedOrganizationsCount} / Unlimited`
  const resolvedSearchParams = (await searchParams) ?? {}
  const createdOrgId = Array.isArray(resolvedSearchParams.created)
    ? resolvedSearchParams.created[0]
    : resolvedSearchParams.created
  const deleted = resolvedSearchParams.deleted === "1"
  const inviteAccepted = resolvedSearchParams.inviteAccepted === "1"
  const left = resolvedSearchParams.left === "1"
  const createdOrg = createdOrgId
    ? availableOrgs.find((candidate) => candidate.id === createdOrgId)
    : null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const isStudio = getPlanFromSubscription(billingSubscription ?? null).apiAccess
  const [accountUsage, teamMembers, pendingInvites, apiKeys] = await Promise.all([
    getBillingUsageSummary({
      billingOwnerId: dbUser.id,
      subscription: accountSubscription,
    }),
    prisma.orgMember.findMany({
      where: {
        orgId: org.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    }),
    prisma.orgInvite.findMany({
      where: {
        orgId: org.id,
        acceptedAt: null,
      },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.apiKey.findMany({
      where: { orgId: org.id, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Manage your workspaces and team preferences.
        </p>
      </div>

      {createdOrg ? (
        <div className="rd-banner rd-banner-success mb-6">
          {createdOrg.name} was created and is now your active workspace.
        </div>
      ) : null}

      {deleted ? (
        <div className="rd-banner rd-banner-success mb-6">
          Workspace deleted successfully.
        </div>
      ) : null}

      {left ? (
        <div className="rd-banner rd-banner-success mb-6">
          You left the previous workspace successfully.
        </div>
      ) : null}

      {inviteAccepted ? (
        <div className="rd-banner rd-banner-success mb-6">
          Workspace invite accepted. It is now available in Settings, and its
          games will appear in the sidebar game switcher once connected.
        </div>
      ) : null}

      {!canCreateOrganization ? (
        <div className="rd-banner rd-banner-warning mb-6">
          {!ownedOrganizationSummary.hasActivePlan ? (
            <>
              This account does not have an active plan yet. Start checkout in{" "}
              <Link href="/account" className="font-medium text-white underline">
                account
              </Link>{" "}
              before creating another workspace.
            </>
          ) : (
            <>
              You already use {ownedWorkspaceLimit} owned workspaces. Upgrade one of your existing workspaces in{" "}
              <Link href="/account" className="font-medium text-white underline">
                account
              </Link>{" "}
              before creating another.
            </>
          )}
        </div>
      ) : null}

      {accountUsage.isOverOrganizationLimit ? (
        <div className="rd-banner rd-banner-warning mb-6">
          This account is over its workspace limit after a downgrade. Existing
          workspaces remain accessible, but you cannot create new ones until
          usage drops below the plan limit.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rd-card p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">
              Workspaces
            </h2>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Switch between workspaces and review your access level.
            </p>
          </div>

          <div className="space-y-4">
            {availableOrgs.map((organization) => {
              const isCurrent = organization.id === org.id
              const canDeleteOrganization = organization.role === "OWNER"
              const organizationPlanState = getPlanState({
                plan: organization.billingPlan,
                createdAt: organization.billingPlanCreatedAt,
              })

              return (
                <div
                  key={organization.id}
                  className="rd-card-muted p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-white">
                          {organization.name}
                        </h3>
                        {isCurrent ? (
                            <span className="rd-pill border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]">
                              Current
                            </span>
                          ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[#9ca3af]">
                        rblxdash.com/{organization.slug}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-start gap-2">
                      {isCurrent ? (
                        <div className="rd-pill">
                          Active workspace
                        </div>
                      ) : (
                        <form action="/api/orgs/current" method="POST">
                          <input type="hidden" name="orgId" value={organization.id} />
                          <input
                            type="hidden"
                            name="redirectTo"
                            value="/dashboard/settings"
                          />
                          <button
                            type="submit"
                            className="rd-button-primary px-3 py-2 text-sm"
                          >
                            Switch to this workspace
                          </button>
                        </form>
                      )}

                      {canDeleteOrganization ? (
                        <DeleteOrganizationButton
                          orgId={organization.id}
                          orgName={organization.name}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm text-[#d1d5db] sm:grid-cols-3">
                    <div>
                      <p className="rd-label">Role</p>
                      <p className="mt-1">{formatOrgRole(organization.role)}</p>
                    </div>
                    <div>
                      <p className="rd-label">Plan</p>
                      <p className="mt-1">
                        {organizationPlanState.displayLabel}
                      </p>
                    </div>
                    <div>
                      <p className="rd-label">Joined</p>
                      <p className="mt-1">
                        {new Date(organization.joinedAt).toLocaleDateString("en-CA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="rd-card p-6">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-white">
              Create workspace
            </h2>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Owned workspace quota: {ownedWorkspaceLimit}. Additional
              workspaces are unlocked by your account plan.
            </p>
            {ownedOrganizationSummary.isTrialActive && ownedOrganizationSummary.trialEndsAt ? (
              <p className="mt-2 text-sm text-[#fdba74]">
                Trial ends on{" "}
                {new Date(ownedOrganizationSummary.trialEndsAt).toLocaleDateString("en-CA")}.
              </p>
            ) : null}
          </div>

          {canCreateOrganization ? (
            <CreateOrganizationForm
              redirectTo="/dashboard/settings"
              submitLabel="Create workspace"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1d1d1d] p-5">
              <p className="text-sm text-[#d1d5db]">
                This account is at its current workspace limit.
              </p>
              <p className="mt-2 text-sm text-[#666666]">
                Start checkout or upgrade your account to `Pro` or `Studio`
                to unlock more workspaces.
              </p>
              <Link
                href="/account"
                className="rd-button-primary mt-4"
              >
                Open account
              </Link>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-6">
        <ApiKeysCard
          initialKeys={apiKeys.map((k) => ({
            id: k.id,
            name: k.name,
            keyPrefix: k.keyPrefix,
            lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
            createdAt: k.createdAt.toISOString(),
            createdBy: { name: k.createdBy.name, email: k.createdBy.email },
          }))}
          isStudio={isStudio}
        />
      </div>

      <div className="mt-6">
        <NotificationsCard
          currentDiscordWebhookUrl={org.discordWebhookUrl ?? null}
          canEdit={canManageTeam}
        />
      </div>

      <div className="mt-6 space-y-6">
        <TeamManagementCard
          currentUserId={dbUser.id}
          currentUserRole={member.role}
          currentOrgName={org.name}
          canManageTeam={canManageTeam}
          isBillingOwner={member.userId === org.billingOwnerId}
          members={teamMembers.map((teamMember) => ({
            id: teamMember.id,
            userId: teamMember.user.id,
            name: teamMember.user.name,
            email: teamMember.user.email,
            role: teamMember.role,
            joinedAt: teamMember.joinedAt.toISOString(),
          }))}
          pendingInvites={pendingInvites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            createdAt: invite.createdAt.toISOString(),
            expiresAt: invite.expiresAt.toISOString(),
            inviteUrl: `${appUrl}/invite/${invite.token}`,
            invitedByLabel: invite.invitedBy.name ?? invite.invitedBy.email,
          }))}
        />

        <PermissionsMatrixCard />
      </div>
    </div>
  )
}
