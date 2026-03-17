import { registerLocale } from "../i18n"

registerLocale("en", {
  // ─── Common ──────────────────────────────────────────────────────────────
  "common.loading": "Loading...",
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.confirm": "Confirm",
  "common.back": "Back",
  "common.next": "Next",
  "common.search": "Search",
  "common.filter": "Filter",
  "common.export": "Export",
  "common.retry": "Try again",
  "common.close": "Close",
  "common.copy": "Copy",
  "common.copied": "Copied!",
  "common.noResults": "No results found.",
  "common.required": "Required",

  // ─── Auth ────────────────────────────────────────────────────────────────
  "auth.signIn": "Sign in",
  "auth.signUp": "Create account",
  "auth.signOut": "Sign out",

  // ─── Navigation ──────────────────────────────────────────────────────────
  "nav.overview": "Overview",
  "nav.games": "Games",
  "nav.players": "Players",
  "nav.moderation": "Moderation",
  "nav.servers": "Servers",
  "nav.logs": "Logs",
  "nav.analytics": "Analytics",
  "nav.health": "Health",
  "nav.settings": "Settings",
  "nav.billing": "Billing",
  "nav.audit": "Audit log",
  "nav.guide": "Setup guide",
  "nav.docs": "API docs",

  // ─── Dashboard ───────────────────────────────────────────────────────────
  "dashboard.welcome": "Welcome back, {name}",
  "dashboard.noGames": "No games connected yet.",
  "dashboard.addFirstGame": "Add your first game to start tracking.",

  // ─── Games ───────────────────────────────────────────────────────────────
  "games.create": "Add game",
  "games.name": "Game name",
  "games.placeId": "Roblox Place ID",
  "games.universeId": "Universe ID",
  "games.webhookSecret": "Webhook secret",
  "games.modules": "Enabled modules",
  "games.created": "Game created successfully.",
  "games.deleted": "Game deleted.",

  // ─── Players ─────────────────────────────────────────────────────────────
  "players.title": "Players",
  "players.online": "Online",
  "players.offline": "Offline",
  "players.lastSeen": "Last seen {time}",
  "players.firstSeen": "First seen {time}",
  "players.noPlayers": "No players tracked yet.",

  // ─── Moderation ──────────────────────────────────────────────────────────
  "moderation.title": "Moderation",
  "moderation.ban": "Ban",
  "moderation.kick": "Kick",
  "moderation.timeout": "Timeout",
  "moderation.unban": "Unban",
  "moderation.reason": "Reason",
  "moderation.active": "Active",
  "moderation.expired": "Expired",
  "moderation.pending": "Pending delivery",
  "moderation.applied": "Applied",
  "moderation.failed": "Delivery failed",

  // ─── Servers ─────────────────────────────────────────────────────────────
  "servers.title": "Live servers",
  "servers.noServers": "No servers are currently active.",
  "servers.playerCount": "{count} players",
  "servers.region": "Region",
  "servers.uptime": "Uptime",

  // ─── Analytics ───────────────────────────────────────────────────────────
  "analytics.title": "Analytics",
  "analytics.dau": "Daily active users",
  "analytics.mau": "Monthly active users",
  "analytics.revenue": "Revenue",
  "analytics.sessions": "Sessions",
  "analytics.newPlayers": "New players",

  // ─── Billing ─────────────────────────────────────────────────────────────
  "billing.title": "Billing",
  "billing.currentPlan": "Current plan",
  "billing.upgrade": "Upgrade",
  "billing.manage": "Manage subscription",
  "billing.free": "Free",
  "billing.pro": "Pro",
  "billing.studio": "Studio",
  "billing.trial": "Trial — {days} days remaining",
  "billing.trialExpired": "Trial expired",

  // ─── Settings ────────────────────────────────────────────────────────────
  "settings.title": "Settings",
  "settings.workspace": "Workspace",
  "settings.members": "Members",
  "settings.invites": "Invites",
  "settings.apiKeys": "API keys",
  "settings.discord": "Discord alerts",
  "settings.dangerZone": "Danger zone",

  // ─── Errors ──────────────────────────────────────────────────────────────
  "error.generic": "Something went wrong.",
  "error.notFound": "Page not found.",
  "error.unauthorized": "You must be signed in to access this page.",
  "error.forbidden": "You don't have permission to perform this action.",
  "error.rateLimit": "Too many requests. Please try again later.",
  "error.maintenance": "RblxDash is undergoing maintenance. We'll be back shortly.",
})
