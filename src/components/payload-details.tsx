import type { Prisma } from "@prisma/client"

function stringifyValue(value: unknown) {
  if (value === null || value === undefined) {
    return "None"
  }

  if (typeof value === "string") {
    return value
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value)
  }

  return JSON.stringify(value)
}

function normalizeEntries(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return []
  }

  return Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => ({
    key,
    value: stringifyValue(entryValue),
  }))
}

export default function PayloadDetails({
  payload,
  collapsedLabel = "Show payload",
}: {
  payload: Prisma.JsonValue | unknown
  collapsedLabel?: string
}) {
  const entries = normalizeEntries(payload)

  if (entries.length === 0) {
    return (
      <span className="text-sm text-[#666666]">
        {typeof payload === "string" && payload.trim() ? payload : "No payload details"}
      </span>
    )
  }

  return (
    <details className="rd-card-muted">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#d1d5db] marker:hidden">
        {collapsedLabel}
      </summary>
      <div className="border-t border-[#2a2a2a] px-4 py-3">
        <dl className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <div key={entry.key} className="rd-card px-3 py-3">
              <dt className="rd-label">
                {entry.key}
              </dt>
              <dd className="mt-2 break-all text-sm text-[#e5e7eb]">{entry.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  )
}
