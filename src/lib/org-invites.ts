export const ORG_INVITE_DURATION_DAYS = 7

export function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getOrgInviteExpirationDate() {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + ORG_INVITE_DURATION_DAYS)
  return expirationDate
}

export function isOrgInviteExpired(expiresAt: Date) {
  return expiresAt.getTime() <= Date.now()
}
