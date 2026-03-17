import type { Organization, OrgMember, Game, OrgRole } from "@prisma/client"

// Re-export Prisma types used across the app
export type { Organization, OrgMember, Game, OrgRole }
export type {
  User,
  TrackedPlayer,
  Sanction,
  SanctionType,
  PlayerNote,
  GameLog,
  AnalyticsSnapshot,
  Subscription,
  Plan,
  SubscriptionStatus,
} from "@prisma/client"

// Module identifiers supported by the platform
export type ModuleId =
  | "moderation"
  | "analytics"
  | "economy"
  | "players"
  | "logs"

// Context object passed through dashboard server components / actions
export type OrgContext = {
  org: Organization
  member: OrgMember
  games: Game[]
}
