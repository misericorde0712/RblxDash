import type {
  Sanction,
  SanctionDeliveryStatus,
  SanctionType,
} from "@prisma/client"

export const SANCTION_TYPE_LABELS: Record<SanctionType, string> = {
  KICK: "Kick",
  TIMEOUT: "Timeout",
  BAN: "Ban",
  UNBAN: "Unban",
}

export const SANCTION_DELIVERY_STATUS_LABELS: Record<
  SanctionDeliveryStatus,
  string
> = {
  PENDING: "Pending",
  APPLIED: "Applied",
  FAILED: "Failed",
}

export const DEFAULT_TIMEOUT_MINUTES = 30
export const KICK_COMMAND_WINDOW_MINUTES = 2

export function formatSanctionType(type: SanctionType) {
  return SANCTION_TYPE_LABELS[type]
}

export function formatSanctionDeliveryStatus(status: SanctionDeliveryStatus) {
  return SANCTION_DELIVERY_STATUS_LABELS[status]
}

export function getSanctionExpiresAt(params: {
  type: SanctionType
  durationMinutes?: number | null
  referenceDate?: Date
}) {
  const referenceDate = params.referenceDate ?? new Date()

  switch (params.type) {
    case "KICK": {
      return new Date(
        referenceDate.getTime() + KICK_COMMAND_WINDOW_MINUTES * 60 * 1000
      )
    }
    case "TIMEOUT": {
      const durationMinutes = params.durationMinutes ?? DEFAULT_TIMEOUT_MINUTES
      return new Date(referenceDate.getTime() + durationMinutes * 60 * 1000)
    }
    case "BAN": {
      if (!params.durationMinutes) {
        return null
      }

      return new Date(referenceDate.getTime() + params.durationMinutes * 60 * 1000)
    }
    case "UNBAN":
      return null
  }
}

export function isSanctionCurrentlyActive(
  sanction: Pick<Sanction, "active" | "expiresAt">,
  referenceDate: Date = new Date()
) {
  if (!sanction.active) {
    return false
  }

  if (!sanction.expiresAt) {
    return true
  }

  return sanction.expiresAt.getTime() > referenceDate.getTime()
}

export function formatSanctionWindow(params: {
  type: SanctionType
  createdAt: Date
  expiresAt: Date | null
}) {
  if (params.type === "KICK") {
    return "Immediate"
  }

  if (!params.expiresAt) {
    return params.type === "BAN" ? "Permanent" : "No expiry"
  }

  const durationMinutes = Math.max(
    1,
    Math.round((params.expiresAt.getTime() - params.createdAt.getTime()) / 60000)
  )

  if (durationMinutes < 60) {
    return `${durationMinutes} min`
  }

  const durationHours = Math.round((durationMinutes / 60) * 10) / 10
  if (durationHours < 24) {
    return `${durationHours} h`
  }

  const durationDays = Math.round((durationHours / 24) * 10) / 10
  return `${durationDays} d`
}

export function getSanctionPriority(type: SanctionType) {
  switch (type) {
    case "BAN":
      return 0
    case "TIMEOUT":
      return 1
    case "KICK":
      return 2
    case "UNBAN":
      return 3
  }
}
