import type { OrgRole } from "@prisma/client"

export const ORG_ROLE_ORDER = ["MODERATOR", "ADMIN", "OWNER"] as const satisfies OrgRole[]

const ROLE_WEIGHT: Record<OrgRole, number> = {
  MODERATOR: 0,
  ADMIN: 1,
  OWNER: 2,
}

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  MODERATOR: "Moderator",
  ADMIN: "Admin",
  OWNER: "Owner",
}

export function formatOrgRole(role: OrgRole) {
  return ORG_ROLE_LABELS[role]
}

export function hasRequiredRole(role: OrgRole, minRole: OrgRole) {
  return ROLE_WEIGHT[role] >= ROLE_WEIGHT[minRole]
}

export function canManageBilling(role: OrgRole) {
  return role === "ADMIN" || role === "OWNER"
}

export function canManageMembers(role: OrgRole) {
  return role === "ADMIN" || role === "OWNER"
}

export function canAssignRole(actorRole: OrgRole, targetRole: OrgRole) {
  if (actorRole === "OWNER") {
    return true
  }

  if (actorRole === "ADMIN") {
    return targetRole === "MODERATOR" || targetRole === "ADMIN"
  }

  return false
}

export function canManageTargetRole(actorRole: OrgRole, targetRole: OrgRole) {
  if (actorRole === "OWNER") {
    return true
  }

  if (actorRole === "ADMIN") {
    return targetRole !== "OWNER"
  }

  return false
}

export function getAssignableRoles(actorRole: OrgRole): OrgRole[] {
  return ORG_ROLE_ORDER.filter((role) => canAssignRole(actorRole, role))
}
