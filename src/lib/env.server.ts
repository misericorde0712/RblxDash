import { z } from "zod"

const serverSchema = z.object({
  // ─── Required ─────────────────────────────────────────────
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PRICE_PRO: z.string().min(1, "STRIPE_PRICE_PRO is required"),
  STRIPE_PRICE_STUDIO: z.string().min(1, "STRIPE_PRICE_STUDIO is required"),

  // ─── Runtime ──────────────────────────────────────────────
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ─── Optional: Email ──────────────────────────────────────
  RESEND_API_KEY: z.string().optional(),

  // ─── Optional: Cron ───────────────────────────────────────
  CRON_SECRET: z.string().optional(),

  // ─── Optional: Roblox OAuth ───────────────────────────────
  ROBLOX_OAUTH_CLIENT_ID: z.string().optional(),
  ROBLOX_OAUTH_CLIENT_SECRET: z.string().optional(),
  ROBLOX_OAUTH_SCOPES: z.string().optional(),
  ROBLOX_OAUTH_PUBLIC_ENABLED: z.string().optional(),
  ROBLOX_OAUTH_ENCRYPTION_KEY: z.string().optional(),

  // ─── Optional: Encryption ────────────────────────────────
  OPEN_CLOUD_API_KEY_ENCRYPTION_KEY: z.string().optional(),

  // ─── Optional: Maintenance ────────────────────────────────
  MAINTENANCE_MODE: z.string().optional(),
  MAINTENANCE_MESSAGE: z.string().optional(),
  MAINTENANCE_ALLOWED_IPS: z.string().optional(),

  // ─── Optional: Upstash Redis ──────────────────────────────
  UPSTASH_REDIS_REST_URL: z.string().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ─── Optional: Sentry ─────────────────────────────────────
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

export const env = serverSchema.parse(process.env)
export type ServerEnv = z.infer<typeof serverSchema>
