import type { Prisma } from "@prisma/client"
import { requireCurrentOrg } from "@/lib/auth"
import {
  formatAuditEvent,
  formatAuditPayload,
} from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import PayloadDetails from "@/components/payload-details"

function isJsonObject(
  value: Prisma.JsonValue | null
): value is Record<string, Prisma.JsonValue> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function getActorLabel(log: {
  actor: {
    name: string | null
    email: string
  } | null
}) {
  return log.actor?.name ?? log.actor?.email ?? "System"
}

function getAuditLogDetails(log: {
  event: string
  payload: Prisma.JsonValue | null
}) {
  if (!isJsonObject(log.payload)) {
    return formatAuditPayload(log.payload)
  }

  switch (log.event) {
    case "workspace.created":
      return typeof log.payload.name === "string"
        ? log.payload.name
        : null
    case "workspace.left":
      return typeof log.payload.role === "string"
        ? `Left as ${log.payload.role}`
        : null
    case "workspace.ownership_transferred":
      if (typeof log.payload.toName === "string") {
        return `Transferred to ${log.payload.toName}`
      }

      if (typeof log.payload.toEmail === "string") {
        return `Transferred to ${log.payload.toEmail}`
      }

      return null
    case "member.invited":
      if (
        typeof log.payload.email === "string" &&
        typeof log.payload.role === "string"
      ) {
        return `${log.payload.email} as ${log.payload.role}`
      }

      return null
    case "member.invite_revoked":
      return typeof log.payload.email === "string"
        ? log.payload.email
        : null
    case "member.invite_accepted":
      if (
        typeof log.payload.email === "string" &&
        typeof log.payload.role === "string"
      ) {
        return `${log.payload.email} joined as ${log.payload.role}`
      }

      return null
    case "member.role_changed":
      if (
        typeof log.payload.email === "string" &&
        typeof log.payload.fromRole === "string" &&
        typeof log.payload.toRole === "string"
      ) {
        return `${log.payload.email}: ${log.payload.fromRole} -> ${log.payload.toRole}`
      }

      return null
    case "member.removed":
      if (
        typeof log.payload.email === "string" &&
        typeof log.payload.role === "string"
      ) {
        return `${log.payload.email} (${log.payload.role})`
      }

      return null
    case "game.created":
      if (
        typeof log.payload.name === "string" &&
        typeof log.payload.robloxPlaceId === "string"
      ) {
        return `${log.payload.name} (${log.payload.robloxPlaceId})`
      }

      return null
    case "game.secret_rotated":
      return typeof log.payload.name === "string"
        ? log.payload.name
        : null
    case "player.sanction_added":
      if (
        typeof log.payload.type === "string" &&
        typeof log.payload.reason === "string"
      ) {
        const playerLabel =
          typeof log.payload.displayName === "string"
            ? log.payload.displayName
            : typeof log.payload.username === "string"
              ? `@${log.payload.username}`
              : typeof log.payload.robloxId === "string"
                ? log.payload.robloxId
                : "player"

        return `${log.payload.type} for ${playerLabel}: ${log.payload.reason}`
      }

      return null
    default:
      return formatAuditPayload(log.payload)
  }
}

export default async function AuditPage() {
  const { org } = await requireCurrentOrg()
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      orgId: org.id,
    },
    include: {
      actor: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Audit</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Administrative audit trail for {org.name}.
        </p>
      </div>

      <div className="rd-card mb-6 p-4 text-sm text-[#9ca3af]">
        This page tracks workspace administration events such as invites,
        role changes, ownership transfers, and configuration updates.
      </div>

      {auditLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#222222] py-16 text-center">
          <h2 className="text-base font-semibold text-white">
            No audit entries yet
          </h2>
          <p className="mt-2 text-sm text-[#666666]">
            Sensitive workspace actions will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="rd-table-shell overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-300">
              <thead>
                <tr>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Time
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Actor
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Event
                  </th>
                  <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => {
                  const details = getAuditLogDetails(log)

                  return (
                    <tr key={log.id} className="hover:bg-[#1d1d1d]/60">
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                        {new Date(log.createdAt).toLocaleString("en-CA", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-white">
                        {getActorLabel(log)}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#e5e7eb]">
                        {formatAuditEvent(log.event)}
                      </td>
                      <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#9ca3af]">
                        {details ? (
                          <div className="space-y-3">
                            <span className="block break-words">{details}</span>
                            {isJsonObject(log.payload) ? (
                              <PayloadDetails
                                payload={log.payload}
                                collapsedLabel="Show structured details"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[#666666]">No details</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
