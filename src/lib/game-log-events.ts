function asPayloadRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {}
  }

  return payload as Record<string, unknown>
}

function getPayloadString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  if (typeof value === "string" && value.trim() !== "") {
    return value.trim()
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  return null
}

function getPayloadNumber(payload: Record<string, unknown>, key: string) {
  const value = payload[key]

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function humanizeIdentifier(value: string) {
  const normalized = value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")

  if (!normalized) {
    return "Unknown"
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatAmount(value: number) {
  const formatter = new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  })

  return formatter.format(value)
}

function buildSummary(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" • ")
}

function formatServerLabel(jobId: string | null) {
  if (!jobId) {
    return null
  }

  if (jobId.startsWith("studio-")) {
    return "Studio server"
  }

  return `Server ${jobId.slice(0, 8)}`
}

function formatPlayerCount(payload: Record<string, unknown>) {
  const playerCount = getPayloadNumber(payload, "playerCount")

  if (playerCount === null) {
    return null
  }

  return playerCount === 1 ? "1 player online" : `${formatAmount(playerCount)} players online`
}

function formatUptime(payload: Record<string, unknown>) {
  const uptimeSeconds = getPayloadNumber(payload, "uptimeSeconds")

  if (uptimeSeconds === null) {
    return null
  }

  if (uptimeSeconds < 60) {
    return `${Math.max(0, Math.round(uptimeSeconds))}s uptime`
  }

  const minutes = Math.round(uptimeSeconds / 60)
  return `${minutes}m uptime`
}

function getActionKey(payload: Record<string, unknown>) {
  const action = getPayloadString(payload, "action")
  return action ? `action:${action}` : "action:unknown"
}

export function getGameLogEventKey(event: string, payload: unknown) {
  if (event === "player_action") {
    return getActionKey(asPayloadRecord(payload))
  }

  return event
}

export function getGameLogEventLabelFromKey(eventKey: string) {
  switch (eventKey) {
    case "player_join":
      return "Player joined"
    case "player_leave":
      return "Player left"
    case "player_session_started":
      return "Player session started"
    case "player_session_ended":
      return "Player session ended"
    case "server_started":
      return "Server started"
    case "server_stopped":
      return "Server stopped"
    case "server_heartbeat":
      return "Server heartbeat"
    case "action:economy":
      return "Economy update"
    case "action:progression":
      return "Progression update"
    case "action:round_finished":
      return "Round finished"
    case "action:daily_reward_claimed":
      return "Daily reward claimed"
    case "action:shop_purchase_completed":
      return "Shop purchase completed"
    case "action:robux_purchase_completed":
      return "Robux purchase completed"
    case "action:moderation_applied":
      return "Moderation applied"
    case "action:moderation_failed":
      return "Moderation failed"
    case "moderation_applied":
      return "Moderation applied"
    case "moderation_failed":
      return "Moderation failed"
    default:
      if (eventKey.startsWith("action:")) {
        return humanizeIdentifier(eventKey.slice("action:".length))
      }

      return humanizeIdentifier(eventKey)
  }
}

export function getGameLogEventBadgeClassName(eventKey: string) {
  if (eventKey === "moderation_applied" || eventKey === "action:moderation_applied") {
    return "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
  }

  if (eventKey === "moderation_failed" || eventKey === "action:moderation_failed") {
    return "border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] text-[#fecaca]"
  }

  if (eventKey.startsWith("server_")) {
    return "border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]"
  }

  if (
    eventKey === "player_join" ||
    eventKey === "player_session_started"
  ) {
    return "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
  }

  if (
    eventKey === "player_leave" ||
    eventKey === "player_session_ended"
  ) {
    return "border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.08)] text-[#fde68a]"
  }

  if (eventKey === "action:economy" || eventKey === "action:robux_purchase_completed") {
    return "border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] text-[#bbf7d0]"
  }

  if (eventKey === "action:progression") {
    return "border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]"
  }

  if (eventKey.startsWith("action:")) {
    return "border-[rgba(232,130,42,0.24)] bg-[rgba(232,130,42,0.08)] text-[#fdba74]"
  }

  return "border-[#2a2a2a] bg-[#1a1a1a] text-[#d1d5db]"
}

export function getGameLogEventDisplay(event: string, payload: unknown) {
  const payloadRecord = asPayloadRecord(payload)
  const eventKey = getGameLogEventKey(event, payload)
  const rawAction = event === "player_action" ? getPayloadString(payloadRecord, "action") : null
  let label = getGameLogEventLabelFromKey(eventKey)
  let summary = ""

  if (eventKey === "player_join") {
    summary = buildSummary([
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
      getPayloadString(payloadRecord, "placeId")
        ? `Place ${getPayloadString(payloadRecord, "placeId")}`
        : null,
    ])
  } else if (eventKey === "player_leave") {
    summary = buildSummary([
      "Player disconnected",
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
    ])
  } else if (eventKey === "player_session_started") {
    summary = buildSummary([
      "Live session detected",
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
    ])
  } else if (eventKey === "player_session_ended") {
    summary = buildSummary([
      "Session ended",
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
    ])
  } else if (eventKey === "server_started") {
    summary = buildSummary([
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
      formatPlayerCount(payloadRecord),
    ])
  } else if (eventKey === "server_heartbeat") {
    summary = buildSummary([
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
      formatPlayerCount(payloadRecord),
      formatUptime(payloadRecord),
    ])
  } else if (eventKey === "server_stopped") {
    summary = buildSummary([
      formatServerLabel(getPayloadString(payloadRecord, "jobId")),
      formatPlayerCount(payloadRecord),
      "Server shut down",
    ])
  } else if (eventKey === "action:economy") {
    const flowType = getPayloadString(payloadRecord, "flowType")
    const currency = getPayloadString(payloadRecord, "currency")
    const amount = getPayloadNumber(payloadRecord, "amount")
    const entry = getPayloadString(payloadRecord, "entry")
    const purchaseType = getPayloadString(payloadRecord, "purchaseType")
    const itemLabel =
      getPayloadString(payloadRecord, "productName") ??
      getPayloadString(payloadRecord, "itemName") ??
      getPayloadString(payloadRecord, "rewardId")

    if (currency === "Robux" || entry === "robux_purchase") {
      label = "Robux purchase"
    } else if (entry === "daily_reward") {
      label = "Daily reward claimed"
    } else if (entry === "shop_purchase") {
      label = "Shop purchase"
    } else if (flowType === "source") {
      label = "Currency earned"
    } else if (flowType === "sink") {
      label = "Currency spent"
    }

    const amountLabel =
      amount === null || !currency
        ? null
        : `${flowType === "source" ? "+" : flowType === "sink" ? "-" : ""}${formatAmount(
            amount
          )} ${currency}`

    summary = buildSummary([
      amountLabel,
      itemLabel,
      entry ? humanizeIdentifier(entry) : null,
      purchaseType ? humanizeIdentifier(purchaseType) : null,
    ])
  } else if (eventKey === "action:progression") {
    const step = getPayloadString(payloadRecord, "step")
    const system = getPayloadString(payloadRecord, "system")
    const questId = getPayloadString(payloadRecord, "questId")
    const xp = getPayloadNumber(payloadRecord, "xp")

    if (step) {
      label = humanizeIdentifier(step)
    }

    summary = buildSummary([
      system ? humanizeIdentifier(system) : null,
      questId ? `Quest ${questId}` : null,
      xp === null ? null : `+${formatAmount(xp)} XP`,
    ])
  } else if (eventKey === "action:round_finished") {
    summary = buildSummary([
      getPayloadString(payloadRecord, "result")
        ? humanizeIdentifier(getPayloadString(payloadRecord, "result") ?? "")
        : null,
      getPayloadString(payloadRecord, "map")
        ? `Map ${getPayloadString(payloadRecord, "map")}`
        : null,
      getPayloadNumber(payloadRecord, "durationSeconds") !== null
        ? `${formatAmount(getPayloadNumber(payloadRecord, "durationSeconds") ?? 0)}s`
        : null,
    ])
  } else if (eventKey === "action:daily_reward_claimed") {
    summary = buildSummary([
      getPayloadString(payloadRecord, "rewardId")
        ? `Reward ${getPayloadString(payloadRecord, "rewardId")}`
        : null,
      getPayloadNumber(payloadRecord, "amount") !== null &&
      getPayloadString(payloadRecord, "currency")
        ? `+${formatAmount(getPayloadNumber(payloadRecord, "amount") ?? 0)} ${getPayloadString(
            payloadRecord,
            "currency"
          )}`
        : null,
    ])
  } else if (eventKey === "action:shop_purchase_completed") {
    summary = buildSummary([
      getPayloadString(payloadRecord, "productName") ??
        getPayloadString(payloadRecord, "itemName") ??
        getPayloadString(payloadRecord, "productId"),
      getPayloadNumber(payloadRecord, "amount") !== null &&
      getPayloadString(payloadRecord, "currency")
        ? `${formatAmount(getPayloadNumber(payloadRecord, "amount") ?? 0)} ${getPayloadString(
            payloadRecord,
            "currency"
          )}`
        : null,
    ])
  } else if (eventKey === "action:robux_purchase_completed") {
    summary = buildSummary([
      getPayloadString(payloadRecord, "productName") ??
        getPayloadString(payloadRecord, "productId"),
      getPayloadNumber(payloadRecord, "amount") !== null
        ? `${formatAmount(getPayloadNumber(payloadRecord, "amount") ?? 0)} Robux`
        : null,
      getPayloadString(payloadRecord, "purchaseType")
        ? humanizeIdentifier(getPayloadString(payloadRecord, "purchaseType") ?? "")
        : null,
    ])
  } else if (
    eventKey === "moderation_applied" ||
    eventKey === "moderation_failed" ||
    eventKey === "action:moderation_applied" ||
    eventKey === "action:moderation_failed"
  ) {
    summary = buildSummary([
      getPayloadString(payloadRecord, "sanctionType")
        ? humanizeIdentifier(getPayloadString(payloadRecord, "sanctionType") ?? "")
        : null,
      getPayloadString(payloadRecord, "reason"),
      getPayloadString(payloadRecord, "message") ??
        getPayloadString(payloadRecord, "error"),
    ])
  } else if (eventKey.startsWith("action:")) {
    summary = buildSummary([
      getPayloadString(payloadRecord, "map")
        ? `Map ${getPayloadString(payloadRecord, "map")}`
        : null,
      getPayloadString(payloadRecord, "system")
        ? humanizeIdentifier(getPayloadString(payloadRecord, "system") ?? "")
        : null,
      getPayloadString(payloadRecord, "result")
        ? humanizeIdentifier(getPayloadString(payloadRecord, "result") ?? "")
        : null,
    ])
  }

  return {
    key: eventKey,
    label,
    summary,
    internalKey: rawAction ? `${event}:${rawAction}` : event,
    rawEvent: event,
    rawAction,
    badgeClassName: getGameLogEventBadgeClassName(eventKey),
  }
}
