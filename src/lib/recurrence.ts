/**
 * Pure recurrence logic for Live Events.
 *
 * isEventCurrentlyActive(event, now) determines whether an event
 * with a given recurrence pattern is active at the specified instant.
 */

export type RecurrenceType = "ONCE" | "ALWAYS" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY"

export type RecurrenceEvent = {
  active: boolean
  recurrenceType: RecurrenceType
  startsAt: Date | null
  endsAt: Date | null
  recurrenceInterval: number
  recurrenceDaysOfWeek: number[]
  recurrenceDayOfMonth: number | null
  duration: number | null // minutes
  recurrenceTimeOfDay: string | null // "HH:MM"
  timezone: string
}

export type ActiveResult = {
  isActive: boolean
  occurrenceStart: Date | null
  occurrenceEnd: Date | null
}

const INACTIVE: ActiveResult = { isActive: false, occurrenceStart: null, occurrenceEnd: null }

function getLocalParts(now: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  })

  const parts = fmt.formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0"

  const weekdayStr = get("weekday")
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  }

  return {
    year: parseInt(get("year")),
    month: parseInt(get("month")),
    day: parseInt(get("day")),
    hour: parseInt(get("hour")),
    minute: parseInt(get("minute")),
    second: parseInt(get("second")),
    weekday: weekdayMap[weekdayStr] ?? 0,
  }
}

function minutesSinceMidnight(hour: number, minute: number): number {
  return hour * 60 + minute
}

function parseTimeOfDay(tod: string): { hour: number; minute: number } {
  const [h, m] = tod.split(":").map(Number)
  return { hour: h, minute: m }
}

function isInGlobalWindow(event: RecurrenceEvent, now: Date): boolean {
  if (event.startsAt && now < event.startsAt) return false
  if (event.endsAt && now >= event.endsAt) return false
  return true
}

export function isEventCurrentlyActive(event: RecurrenceEvent, now: Date): ActiveResult {
  if (!event.active) return INACTIVE

  switch (event.recurrenceType) {
    case "ONCE": {
      if (!event.startsAt) return INACTIVE
      if (now < event.startsAt) return INACTIVE
      if (event.endsAt && now >= event.endsAt) return INACTIVE
      return {
        isActive: true,
        occurrenceStart: event.startsAt,
        occurrenceEnd: event.endsAt,
      }
    }

    case "ALWAYS": {
      if (!isInGlobalWindow(event, now)) return INACTIVE
      return {
        isActive: true,
        occurrenceStart: event.startsAt,
        occurrenceEnd: event.endsAt,
      }
    }

    case "HOURLY": {
      if (!isInGlobalWindow(event, now)) return INACTIVE
      if (event.duration == null) return INACTIVE
      const intervalMs = (event.recurrenceInterval || 1) * 60 * 60 * 1000
      const anchor = event.startsAt ?? new Date(0)
      const elapsed = now.getTime() - anchor.getTime()
      if (elapsed < 0) return INACTIVE
      const posInCycle = elapsed % intervalMs
      const durationMs = event.duration * 60 * 1000
      if (posInCycle < durationMs) {
        const occStart = new Date(now.getTime() - posInCycle)
        const occEnd = new Date(occStart.getTime() + durationMs)
        return { isActive: true, occurrenceStart: occStart, occurrenceEnd: occEnd }
      }
      return INACTIVE
    }

    case "DAILY": {
      if (!isInGlobalWindow(event, now)) return INACTIVE
      if (event.duration == null || !event.recurrenceTimeOfDay) return INACTIVE
      const local = getLocalParts(now, event.timezone)
      const tod = parseTimeOfDay(event.recurrenceTimeOfDay)
      const nowMin = minutesSinceMidnight(local.hour, local.minute)
      const startMin = minutesSinceMidnight(tod.hour, tod.minute)
      const diff = nowMin - startMin
      if (diff < 0 || diff >= event.duration) return INACTIVE

      // Check interval: count days since anchor
      if (event.recurrenceInterval > 1 && event.startsAt) {
        const anchorLocal = getLocalParts(event.startsAt, event.timezone)
        const anchorDays = Math.floor(event.startsAt.getTime() / 86400000)
        const nowDays = Math.floor(now.getTime() / 86400000)
        if ((nowDays - anchorDays) % event.recurrenceInterval !== 0) return INACTIVE
      }

      const occStart = new Date(now)
      occStart.setMinutes(occStart.getMinutes() - diff)
      const occEnd = new Date(occStart.getTime() + event.duration * 60000)
      return { isActive: true, occurrenceStart: occStart, occurrenceEnd: occEnd }
    }

    case "WEEKLY": {
      if (!isInGlobalWindow(event, now)) return INACTIVE
      if (event.duration == null || !event.recurrenceTimeOfDay) return INACTIVE
      if (event.recurrenceDaysOfWeek.length === 0) return INACTIVE

      const local = getLocalParts(now, event.timezone)
      if (!event.recurrenceDaysOfWeek.includes(local.weekday)) return INACTIVE

      const tod = parseTimeOfDay(event.recurrenceTimeOfDay)
      const nowMin = minutesSinceMidnight(local.hour, local.minute)
      const startMin = minutesSinceMidnight(tod.hour, tod.minute)
      const diff = nowMin - startMin
      if (diff < 0 || diff >= event.duration) return INACTIVE

      const occStart = new Date(now)
      occStart.setMinutes(occStart.getMinutes() - diff)
      const occEnd = new Date(occStart.getTime() + event.duration * 60000)
      return { isActive: true, occurrenceStart: occStart, occurrenceEnd: occEnd }
    }

    case "MONTHLY": {
      if (!isInGlobalWindow(event, now)) return INACTIVE
      if (event.duration == null || !event.recurrenceTimeOfDay) return INACTIVE
      if (event.recurrenceDayOfMonth == null) return INACTIVE

      const local = getLocalParts(now, event.timezone)
      if (local.day !== event.recurrenceDayOfMonth) return INACTIVE

      const tod = parseTimeOfDay(event.recurrenceTimeOfDay)
      const nowMin = minutesSinceMidnight(local.hour, local.minute)
      const startMin = minutesSinceMidnight(tod.hour, tod.minute)
      const diff = nowMin - startMin
      if (diff < 0 || diff >= event.duration) return INACTIVE

      const occStart = new Date(now)
      occStart.setMinutes(occStart.getMinutes() - diff)
      const occEnd = new Date(occStart.getTime() + event.duration * 60000)
      return { isActive: true, occurrenceStart: occStart, occurrenceEnd: occEnd }
    }

    default:
      return INACTIVE
  }
}
