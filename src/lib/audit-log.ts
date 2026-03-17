import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const AUDIT_LOG_EVENT_LABELS = {
  "workspace.created": "Workspace created",
  "workspace.left": "Workspace left",
  "workspace.deleted": "Workspace deleted",
  "workspace.ownership_transferred": "Workspace ownership transferred",
  "member.invited": "Member invited",
  "member.invite_revoked": "Invite revoked",
  "member.invite_accepted": "Invite accepted",
  "member.role_changed": "Member role changed",
  "member.removed": "Member removed",
  "game.created": "Game created",
  "game.secret_rotated": "Game secret rotated",
  "player.note_added": "Player note added",
  "player.sanction_added": "Player sanction added",
  "server.command_sent": "Server command sent",
} as const

export type AuditLogEvent = keyof typeof AUDIT_LOG_EVENT_LABELS

type AuditLogClient = Prisma.TransactionClient | typeof prisma

export async function createAuditLog(
  client: AuditLogClient,
  params: {
    orgId: string
    actorUserId?: string | null
    event: AuditLogEvent
    targetType?: string
    targetId?: string
    payload?: Prisma.InputJsonValue
  }
) {
  return client.auditLog.create({
    data: {
      orgId: params.orgId,
      actorUserId: params.actorUserId ?? null,
      event: params.event,
      targetType: params.targetType,
      targetId: params.targetId,
      payload: params.payload,
    },
  })
}

export function formatAuditEvent(event: string) {
  return AUDIT_LOG_EVENT_LABELS[event as AuditLogEvent] ?? event
}

export function formatAuditPayload(payload: Prisma.JsonValue | null) {
  if (!payload) {
    return null
  }

  if (typeof payload === "string") {
    return payload
  }

  if (typeof payload === "object" && !Array.isArray(payload)) {
    const objectPayload = payload as Record<string, unknown>

    if (
      typeof objectPayload.type === "string" &&
      typeof objectPayload.reason === "string"
    ) {
      return `${objectPayload.type}: ${objectPayload.reason}`
    }
  }

  return JSON.stringify(payload, null, 2)
}
