import type { Plan } from "@prisma/client"
import { env } from "@/lib/env.server"

const TRUE_VALUES = new Set(["1", "true", "yes", "on"])

function isEnabled(value: string | undefined) {
  if (!value) {
    return false
  }

  return TRUE_VALUES.has(value.trim().toLowerCase())
}

export function isSelfHostedMode() {
  return isEnabled(env.SELF_HOSTED)
}

export function getSelfHostedPlan(): Plan {
  return env.SELF_HOST_PLAN ?? "STUDIO"
}

export function isManagedBillingEnabled() {
  return Boolean(
    !isSelfHostedMode() &&
      env.STRIPE_SECRET_KEY &&
      env.STRIPE_PRICE_PRO &&
      env.STRIPE_PRICE_STUDIO
  )
}

export function isStripeWebhookConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET)
}

export function getManagedBillingDisabledReason() {
  if (isSelfHostedMode()) {
    return "Billing is disabled in self-host mode."
  }

  return "Stripe billing is not configured on this deployment."
}
