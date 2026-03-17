"use client"

import { startTransition, useState } from "react"
import type { OrgRole } from "@prisma/client"
import { useRouter } from "next/navigation"
import CopyButton from "@/components/copy-button"
import {
  canManageTargetRole,
  formatOrgRole,
  getAssignableRoles,
} from "@/lib/org-members"

type TeamMember = {
  id: string
  userId: string
  name: string | null
  email: string
  role: OrgRole
  joinedAt: string
}

type PendingInvite = {
  id: string
  email: string
  role: OrgRole
  createdAt: string
  expiresAt: string
  inviteUrl: string
  invitedByLabel: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function sortMembers(members: TeamMember[]) {
  const roleOrder = ["OWNER", "ADMIN", "MODERATOR"] as const

  return [...members].sort((left, right) => {
    const leftWeight = roleOrder.indexOf(left.role)
    const rightWeight = roleOrder.indexOf(right.role)

    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight
    }

    return new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime()
  })
}

export default function TeamManagementCard({
  currentUserId,
  currentUserRole,
  currentOrgName,
  canManageTeam,
  isBillingOwner,
  members,
  pendingInvites,
}: {
  currentUserId: string
  currentUserRole: OrgRole
  currentOrgName: string
  canManageTeam: boolean
  isBillingOwner: boolean
  members: TeamMember[]
  pendingInvites: PendingInvite[]
}) {
  const router = useRouter()
  const assignableRoles = getAssignableRoles(currentUserRole)
  const [workspaceMembers, setWorkspaceMembers] = useState(() => sortMembers(members))
  const [workspaceInvites, setWorkspaceInvites] = useState(pendingInvites)
  const [billingOwnerState, setBillingOwnerState] = useState(isBillingOwner)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<OrgRole>(assignableRoles[0] ?? "MODERATOR")
  const [transferTargetMemberId, setTransferTargetMemberId] = useState(
    members.find((member) => member.userId !== currentUserId)?.id ?? ""
  )
  const [roleDrafts, setRoleDrafts] = useState<Record<string, OrgRole>>(() =>
    Object.fromEntries(members.map((member) => [member.id, member.role]))
  )
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const ownersCount = workspaceMembers.filter((member) => member.role === "OWNER").length
  const canTransferOwnership = currentUserRole === "OWNER" && workspaceMembers.length > 1
  const transferCandidates = workspaceMembers.filter(
    (member) => member.userId !== currentUserId
  )
  const canLeaveWorkspace =
    currentUserRole !== "OWNER" || (!billingOwnerState && ownersCount > 1)

  async function handleCreateInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusyKey("invite")
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/orgs/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to create invite")
        return
      }

      const nextInvite = {
        id: data.invite.id,
        email: data.invite.email,
        role: data.invite.role,
        createdAt: new Date().toISOString(),
        expiresAt: data.invite.expiresAt,
        inviteUrl: data.invite.inviteUrl,
        invitedByLabel: "You",
      } satisfies PendingInvite

      setWorkspaceInvites((currentInvites) => [
        nextInvite,
        ...currentInvites.filter((invite) => invite.email !== nextInvite.email),
      ])
      setInviteEmail("")
      setInviteRole(assignableRoles[0] ?? "MODERATOR")
      startTransition(() => router.refresh())
    } catch {
      setError("Unable to create invite")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleSaveRole(memberId: string) {
    const nextRole = roleDrafts[memberId]
    const targetMember = workspaceMembers.find((member) => member.id === memberId)

    if (!nextRole || !targetMember || nextRole === targetMember.role) {
      return
    }

    setBusyKey(`role:${memberId}`)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/orgs/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: nextRole,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to update member role")
        return
      }

      setWorkspaceMembers((currentMembers) =>
        sortMembers(
          currentMembers.map((member) =>
            member.id === memberId ? { ...member, role: data.member.role } : member
          )
        )
      )
      startTransition(() => router.refresh())
    } catch {
      setError("Unable to update member role")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleRemoveMember(memberId: string) {
    const targetMember = workspaceMembers.find((member) => member.id === memberId)
    if (!targetMember) {
      return
    }

    if (!window.confirm(`Remove ${targetMember.email} from this workspace?`)) {
      return
    }

    setBusyKey(`remove:${memberId}`)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/orgs/members/${memberId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to remove member")
        return
      }

      setWorkspaceMembers((currentMembers) =>
        currentMembers.filter((member) => member.id !== memberId)
      )
      startTransition(() => router.refresh())
    } catch {
      setError("Unable to remove member")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleRevokeInvite(inviteId: string) {
    if (!window.confirm("Revoke this invite?")) {
      return
    }

    setBusyKey(`invite:${inviteId}`)
    setError(null)
    setNotice(null)

    try {
      const response = await fetch(`/api/orgs/invites/${inviteId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to revoke invite")
        return
      }

      setWorkspaceInvites((currentInvites) =>
        currentInvites.filter((invite) => invite.id !== inviteId)
      )
      startTransition(() => router.refresh())
    } catch {
      setError("Unable to revoke invite")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleTransferOwnership(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!transferTargetMemberId) {
      return
    }

    setBusyKey("transfer")
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/orgs/current/transfer-ownership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: transferTargetMemberId,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to transfer ownership")
        return
      }

      setWorkspaceMembers((currentMembers) =>
        sortMembers(
          currentMembers.map((workspaceMember) =>
            workspaceMember.id === data.member.id
              ? { ...workspaceMember, role: "OWNER" }
              : workspaceMember
          )
        )
      )
      setRoleDrafts((currentDrafts) => ({
        ...currentDrafts,
        [data.member.id]: "OWNER",
      }))
      setBillingOwnerState(false)
      setNotice(
        `${data.member.name ?? data.member.email} is now an owner and the billing owner for this workspace.`
      )
      startTransition(() => router.refresh())
    } catch {
      setError("Unable to transfer ownership")
    } finally {
      setBusyKey(null)
    }
  }

  async function handleLeaveWorkspace() {
    const confirmed = window.confirm(
      `Leave ${currentOrgName}? You will lose access to this workspace until someone invites you back.`
    )

    if (!confirmed) {
      return
    }

    setBusyKey("leave")
    setError(null)
    setNotice(null)

    try {
      const response = await fetch("/api/orgs/current/leave", {
        method: "POST",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to leave workspace")
        return
      }

      startTransition(() => {
        router.replace(data.redirectTo ?? "/dashboard/settings")
        router.refresh()
      })
    } catch {
      setError("Unable to leave workspace")
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <section className="rd-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">Team</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Manage workspace roles and share invitation links with teammates.
          </p>
        </div>
        {!canManageTeam ? (
          <p className="max-w-sm text-sm text-[#666666]">
            Only admins and owners can invite members or update team roles.
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rd-banner rd-banner-danger mt-5">{error}</div>
      ) : null}

      {notice ? (
        <div className="rd-banner rd-banner-success mt-5">{notice}</div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="mb-4">
            <h3 className="rd-label">
              Members
            </h3>
          </div>

          <div className="space-y-3">
            {workspaceMembers.map((workspaceMember) => {
              const isSelf = workspaceMember.userId === currentUserId
              const canManageTarget =
                canManageTeam &&
                !isSelf &&
                canManageTargetRole(currentUserRole, workspaceMember.role)
              const selectedRole = roleDrafts[workspaceMember.id] ?? workspaceMember.role

              return (
                <div
                  key={workspaceMember.id}
                  className="rd-card-muted p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {workspaceMember.name ?? workspaceMember.email}
                        </p>
                        {isSelf ? (
                          <span className="rd-pill border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]">
                            You
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-[#9ca3af]">
                        {workspaceMember.email}
                      </p>
                    </div>

                    {canManageTarget ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={selectedRole}
                          onChange={(event) =>
                            setRoleDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [workspaceMember.id]: event.target.value as OrgRole,
                            }))
                          }
                          disabled={busyKey !== null}
                          className="rd-input text-sm"
                        >
                          {assignableRoles.map((role) => (
                            <option key={role} value={role}>
                              {formatOrgRole(role)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleSaveRole(workspaceMember.id)}
                          disabled={
                            busyKey !== null || selectedRole === workspaceMember.role
                          }
                          className="rd-button-secondary px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(workspaceMember.id)}
                          disabled={busyKey !== null}
                          className="rounded-lg border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="rd-pill">
                        {formatOrgRole(workspaceMember.role)}
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-[#666666]">
                    Joined {formatDate(workspaceMember.joinedAt)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          {canManageTeam ? (
            <div className="rd-card-muted p-4">
              <h3 className="rd-label">
                Invite member
              </h3>
              <form onSubmit={handleCreateInvite} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="invite-email"
                    className="mb-1.5 block text-sm font-medium text-[#d1d5db]"
                  >
                    Email
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(event) => setInviteEmail(event.target.value)}
                    required
                    placeholder="teammate@studio.com"
                    className="rd-input w-full text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="invite-role"
                    className="mb-1.5 block text-sm font-medium text-[#d1d5db]"
                  >
                    Role
                  </label>
                  <select
                    id="invite-role"
                    value={inviteRole}
                    onChange={(event) => setInviteRole(event.target.value as OrgRole)}
                    className="rd-input w-full text-sm"
                  >
                    {assignableRoles.map((role) => (
                      <option key={role} value={role}>
                        {formatOrgRole(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={busyKey !== null}
                  className="rd-button-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyKey === "invite" ? "Creating..." : "Create invite"}
                </button>
              </form>
            </div>
          ) : null}

          <div className="rd-card-muted p-4">
            <h3 className="rd-label">
              Pending invites
            </h3>

            <div className="mt-4 space-y-3">
              {workspaceInvites.length > 0 ? (
                workspaceInvites.map((invite) => {
                  const expired = new Date(invite.expiresAt).getTime() <= Date.now()

                  return (
                    <div key={invite.id} className="rd-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              {invite.email}
                            </p>
                            <span className="rd-pill">
                              {formatOrgRole(invite.role)}
                            </span>
                            {expired ? (
                              <span className="rd-pill border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.08)] text-[#fde68a]">
                                Expired
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[#666666]">
                            Created {formatDate(invite.createdAt)} by {invite.invitedByLabel}
                          </p>
                          <p className="text-xs text-[#666666]">
                            Expires {formatDate(invite.expiresAt)}
                          </p>
                        </div>

                        {canManageTeam ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(invite.id)}
                            disabled={busyKey !== null}
                            className="rounded-lg border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        ) : null}
                      </div>

                      {!expired ? (
                        <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-2">
                          <code className="truncate text-xs text-[#d1d5db]">
                            {invite.inviteUrl}
                          </code>
                          <CopyButton value={invite.inviteUrl} />
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-[#666666]">
                  No pending invites for this workspace.
                </p>
              )}
            </div>
          </div>

          <div className="rd-card-muted p-4">
            <h3 className="rd-label">
              Ownership
            </h3>

            {currentUserRole === "OWNER" ? (
              <>
                <p className="mt-3 text-sm text-[#d1d5db]">
                  Transfer billing ownership to another member. They will become
                  an owner if they are not one already, and you will stay owner
                  until you change roles or leave.
                </p>

                {canTransferOwnership ? (
                  <form onSubmit={handleTransferOwnership} className="mt-4 space-y-4">
                    <select
                      value={transferTargetMemberId}
                      onChange={(event) => setTransferTargetMemberId(event.target.value)}
                      disabled={busyKey !== null}
                      className="rd-input w-full text-sm"
                    >
                      {transferCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {(candidate.name ?? candidate.email)} ({formatOrgRole(candidate.role)})
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={busyKey !== null || !transferTargetMemberId}
                      className="rd-button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyKey === "transfer" ? "Transferring..." : "Transfer ownership"}
                    </button>
                  </form>
                ) : (
                  <p className="mt-4 text-sm text-[#666666]">
                    Invite or add another member before transferring ownership.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-[#666666]">
                Only owners can transfer workspace ownership.
              </p>
            )}
          </div>

          <div className="rd-card-muted p-4">
            <h3 className="rd-label">
              Leave workspace
            </h3>

            <p className="mt-3 text-sm text-[#d1d5db]">
              Leave this workspace and remove your own access.
            </p>

            {!canLeaveWorkspace ? (
              <p className="mt-3 text-sm text-[#fde68a]">
                {billingOwnerState
                  ? "Transfer ownership before leaving this workspace."
                  : "Promote another owner before leaving this workspace."}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleLeaveWorkspace}
              disabled={busyKey !== null || !canLeaveWorkspace}
              className="mt-4 w-full rounded-lg border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-4 py-2.5 text-sm font-semibold text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyKey === "leave" ? "Leaving..." : "Leave workspace"}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
