type LogLevel = "info" | "warn" | "error" | "debug"

type LogEntry = {
  level: LogLevel
  message: string
  context?: string
  data?: Record<string, unknown>
  error?: Error
  timestamp: string
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    entry.timestamp,
    entry.level.toUpperCase().padEnd(5),
    entry.context ? `[${entry.context}]` : "",
    entry.message,
  ]

  const line = parts.filter(Boolean).join(" ")

  if (entry.data && Object.keys(entry.data).length > 0) {
    return `${line} ${JSON.stringify(entry.data)}`
  }

  return line
}

function createEntry(
  level: LogLevel,
  message: string,
  context?: string,
  data?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    level,
    message,
    context,
    data,
    error,
    timestamp: new Date().toISOString(),
  }
}

function emit(entry: LogEntry) {
  const line = formatEntry(entry)

  switch (entry.level) {
    case "error":
      console.error(line, entry.error ?? "")
      break
    case "warn":
      console.warn(line)
      break
    case "debug":
      if (process.env.NODE_ENV === "development") {
        console.debug(line)
      }
      break
    default:
      console.log(line)
  }
}

/**
 * Crée un logger avec un contexte (nom du module/route).
 *
 * @example
 * const log = createLogger("api/games")
 * log.info("Game created", { gameId: "abc" })
 * log.error("Failed to create game", { orgId }, err)
 */
export function createLogger(context: string) {
  return {
    info(message: string, data?: Record<string, unknown>) {
      emit(createEntry("info", message, context, data))
    },
    warn(message: string, data?: Record<string, unknown>) {
      emit(createEntry("warn", message, context, data))
    },
    error(message: string, data?: Record<string, unknown>, error?: Error) {
      emit(createEntry("error", message, context, data, error))
    },
    debug(message: string, data?: Record<string, unknown>) {
      emit(createEntry("debug", message, context, data))
    },
  }
}

export type Logger = ReturnType<typeof createLogger>
