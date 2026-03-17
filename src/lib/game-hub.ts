export type HealthTone = "healthy" | "warning" | "critical" | "idle"

export function formatCount(value: number) {
  return new Intl.NumberFormat("en-CA").format(value)
}

export function formatDate(value: Date) {
  return value.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function formatDateTime(value: Date) {
  return value.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRelativeTime(value: Date | null, referenceDate = new Date()) {
  if (!value) {
    return "Never"
  }

  const diffSeconds = Math.max(
    0,
    Math.round((referenceDate.getTime() - value.getTime()) / 1000)
  )

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`
  }

  if (diffSeconds < 3600) {
    return `${Math.round(diffSeconds / 60)}m ago`
  }

  if (diffSeconds < 86400) {
    return `${Math.round(diffSeconds / 3600)}h ago`
  }

  return `${Math.round(diffSeconds / 86400)}d ago`
}

export function getHealthPanelClasses(tone: HealthTone) {
  if (tone === "healthy") {
    return "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#4ade80]"
  }

  if (tone === "warning") {
    return "border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.08)] text-[#fbbf24]"
  }

  if (tone === "critical") {
    return "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#f87171]"
  }

  return "border-[rgba(156,163,175,0.22)] bg-[rgba(156,163,175,0.08)] text-[#9ca3af]"
}

export function getHealthBadgeClasses(tone: HealthTone) {
  if (tone === "healthy") {
    return "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.12)] text-[#4ade80]"
  }

  if (tone === "warning") {
    return "border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.12)] text-[#fbbf24]"
  }

  if (tone === "critical") {
    return "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.12)] text-[#f87171]"
  }

  return "border-[rgba(156,163,175,0.22)] bg-[rgba(156,163,175,0.12)] text-[#9ca3af]"
}

export function getToneRank(tone: HealthTone) {
  if (tone === "critical") {
    return 3
  }

  if (tone === "warning") {
    return 2
  }

  if (tone === "idle") {
    return 1
  }

  return 0
}

export function getGameHealth(params: {
  liveServersNow: number
  eventsLast5m: number
  failedModeration24h: number
  pendingModeration: number
  lastEventAt: Date | null
}) {
  const {
    liveServersNow,
    eventsLast5m,
    failedModeration24h,
    pendingModeration,
    lastEventAt,
  } = params

  if (!lastEventAt) {
    return {
      tone: "idle" as HealthTone,
      label: "Not started",
      detail: "No webhook events received yet.",
    }
  }

  if (failedModeration24h > 0) {
    return {
      tone: "critical" as HealthTone,
      label: "Issues",
      detail: `${formatCount(
        failedModeration24h
      )} moderation deliveries failed in the last 24 hours.`,
    }
  }

  if (liveServersNow > 0 && eventsLast5m === 0) {
    return {
      tone: "critical" as HealthTone,
      label: "Live but silent",
      detail:
        "Servers are live, but no fresh telemetry reached Dashblox in the last 5 minutes.",
    }
  }

  if (liveServersNow > 0 && pendingModeration > 0) {
    return {
      tone: "warning" as HealthTone,
      label: "Waiting on ack",
      detail: `${formatCount(
        pendingModeration
      )} moderation actions are waiting for acknowledgement.`,
    }
  }

  if (liveServersNow > 0) {
    return {
      tone: "healthy" as HealthTone,
      label: "Live",
      detail: "Servers are connected and telemetry is flowing.",
    }
  }

  return {
    tone: "idle" as HealthTone,
    label: "Idle",
    detail: "No live servers right now. The game is currently quiet.",
  }
}
