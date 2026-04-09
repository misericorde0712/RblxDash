import { z } from "zod"

const TRUE_VALUES = new Set(["1", "true", "yes", "on"])

function isSelfHostedEnabled(value: string | undefined) {
  if (!value) {
    return false
  }

  return TRUE_VALUES.has(value.trim().toLowerCase())
}

const serverSchema = z
  .object({
    // ─── Required ───────────────────────────────────────────
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    CLERK_SECRET_KEY: z.string().optional(),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_PRO: z.string().optional(),
    STRIPE_PRICE_STUDIO: z.string().optional(),
    STRIPE_PRICE_PRO_YEARLY: z.string().optional(),
    STRIPE_PRICE_STUDIO_YEARLY: z.string().optional(),
    STRIPE_PRICE_PRO_LIFETIME: z.string().optional(),
    STRIPE_PRICE_STUDIO_LIFETIME: z.string().optional(),

    // ─── Runtime ────────────────────────────────────────────
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    SELF_HOSTED: z.string().optional(),
    SELF_HOST_PLAN: z.enum(["FREE", "PRO", "STUDIO"]).optional(),
    LOCAL_AUTH_SECRET: z.string().optional(),

    // ─── Optional: Email ────────────────────────────────────
    RESEND_API_KEY: z.string().optional(),

    // ─── Optional: Cron ─────────────────────────────────────
    CRON_SECRET: z.string().optional(),

    // ─── Optional: Roblox OAuth ─────────────────────────────
    ROBLOX_OAUTH_CLIENT_ID: z.string().optional(),
    ROBLOX_OAUTH_CLIENT_SECRET: z.string().optional(),
    ROBLOX_OAUTH_SCOPES: z.string().optional(),
    ROBLOX_OAUTH_PUBLIC_ENABLED: z.string().optional(),
    ROBLOX_OAUTH_ENCRYPTION_KEY: z.string().optional(),

    // ─── Optional: Encryption ──────────────────────────────
    OPEN_CLOUD_API_KEY_ENCRYPTION_KEY: z.string().optional(),

    // ─── Optional: Maintenance ──────────────────────────────
    MAINTENANCE_MODE: z.string().optional(),
    MAINTENANCE_MESSAGE: z.string().optional(),
    MAINTENANCE_ALLOWED_IPS: z.string().optional(),

    // ─── Optional: Upstash Redis ────────────────────────────
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

    // ─── Optional: Sentry ───────────────────────────────────
    SENTRY_DSN: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const selfHosted = isSelfHostedEnabled(data.SELF_HOSTED)

    if (selfHosted && !data.LOCAL_AUTH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "LOCAL_AUTH_SECRET is required when SELF_HOSTED=true",
        path: ["LOCAL_AUTH_SECRET"],
      })
    }

    if (!selfHosted && !data.CLERK_SECRET_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CLERK_SECRET_KEY is required unless SELF_HOSTED=true",
        path: ["CLERK_SECRET_KEY"],
      })
    }
  })

export const env = serverSchema.parse(process.env)
export type ServerEnv = z.infer<typeof serverSchema>
