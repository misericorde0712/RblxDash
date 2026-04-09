import Stripe from "stripe"
import type { Subscription, Plan, SubscriptionStatus } from "@prisma/client"
import type { ModuleId } from "@/types"
import {
  getManagedBillingDisabledReason,
  getSelfHostedPlan,
  isSelfHostedMode,
} from "@/lib/deployment-mode"
import { env } from "@/lib/env.server"

let stripeClient: Stripe | null = null

function getStripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(getManagedBillingDisabledReason())
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
    })
  }

  return stripeClient
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripeClient(), prop, receiver)
  },
})

export type PaidPlan = Exclude<Plan, "FREE">
export type BillingInterval = "monthly" | "yearly" | "lifetime"
export const FREE_TRIAL_DAYS = 7
const DAY_IN_MS = 1000 * 60 * 60 * 24

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "Free",
  PRO: "Pro",
  STUDIO: "Studio",
}

export type PlanConfig = {
  maxGames: number
  maxOrganizations: number
  logRetentionDays: number
  modules: ModuleId[]
  apiAccess: boolean
}

export const PLANS: Record<Plan, PlanConfig> = {
  FREE: {
    maxGames: 1,
    maxOrganizations: 1,
    logRetentionDays: 7,
    modules: ["players", "logs"],
    apiAccess: false,
  },
  PRO: {
    maxGames: 5,
    maxOrganizations: 3,
    logRetentionDays: 30,
    modules: ["moderation", "analytics", "economy", "players", "logs"],
    apiAccess: false,
  },
  STUDIO: {
    maxGames: Infinity,
    maxOrganizations: Infinity,
    logRetentionDays: 90,
    modules: ["moderation", "analytics", "economy", "players", "logs"],
    apiAccess: true,
  },
}

export const STRIPE_PRICE_IDS: Record<PaidPlan, string | undefined> = {
  PRO: env.STRIPE_PRICE_PRO,
  STUDIO: env.STRIPE_PRICE_STUDIO,
}

export const STRIPE_YEARLY_PRICE_IDS: Record<PaidPlan, string | undefined> = {
  PRO: env.STRIPE_PRICE_PRO_YEARLY,
  STUDIO: env.STRIPE_PRICE_STUDIO_YEARLY,
}

export const STRIPE_LIFETIME_PRICE_IDS: Record<PaidPlan, string | undefined> = {
  PRO: env.STRIPE_PRICE_PRO_LIFETIME,
  STUDIO: env.STRIPE_PRICE_STUDIO_LIFETIME,
}

function getSelfHostedPlanOverride(): Plan | null {
  return isSelfHostedMode() ? getSelfHostedPlan() : null
}

function getDisplayLabel(plan: Plan) {
  if (isSelfHostedMode()) {
    return `${PLAN_LABELS[plan]} (Self-hosted)`
  }

  return PLAN_LABELS[plan]
}

export function getPriceIdForPlan(plan: PaidPlan, interval: BillingInterval = "monthly") {
  let priceId: string | undefined

  switch (interval) {
    case "yearly":
      priceId = STRIPE_YEARLY_PRICE_IDS[plan]
      break
    case "lifetime":
      priceId = STRIPE_LIFETIME_PRICE_IDS[plan]
      break
    default:
      priceId = STRIPE_PRICE_IDS[plan]
  }

  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${plan} (${interval})`)
  }

  return priceId
}

export function getPlanFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE"

  const allPriceIds: Array<{ plan: Plan; id: string | undefined }> = [
    { plan: "PRO", id: STRIPE_PRICE_IDS.PRO },
    { plan: "STUDIO", id: STRIPE_PRICE_IDS.STUDIO },
    { plan: "PRO", id: STRIPE_YEARLY_PRICE_IDS.PRO },
    { plan: "STUDIO", id: STRIPE_YEARLY_PRICE_IDS.STUDIO },
    { plan: "PRO", id: STRIPE_LIFETIME_PRICE_IDS.PRO },
    { plan: "STUDIO", id: STRIPE_LIFETIME_PRICE_IDS.STUDIO },
  ]

  for (const entry of allPriceIds) {
    if (entry.id === priceId) return entry.plan
  }

  return "FREE"
}

export function isLifetimePriceId(priceId: string | null | undefined): boolean {
  if (!priceId) return false
  return priceId === STRIPE_LIFETIME_PRICE_IDS.PRO || priceId === STRIPE_LIFETIME_PRICE_IDS.STUDIO
}

function hasActivePaidBillingAccess(
  params: {
    plan: Plan | null | undefined
    createdAt?: Date | null
    status?: SubscriptionStatus | null
    currentPeriodEnd?: Date | null
  },
  referenceDate = new Date()
) {
  const selfHostedPlan = getSelfHostedPlanOverride()

  if (selfHostedPlan) {
    return selfHostedPlan !== "FREE"
  }

  const storedPlan = params.plan ?? "FREE"

  if (storedPlan === "FREE") {
    return false
  }

  if (params.status === "TRIALING") {
    const trialEndsAt =
      params.currentPeriodEnd ??
      new Date((params.createdAt ?? referenceDate).getTime() + FREE_TRIAL_DAYS * DAY_IN_MS)

    return trialEndsAt.getTime() > referenceDate.getTime()
  }

  if (!params.status || params.status === "ACTIVE") {
    return true
  }

  return Boolean(
    params.currentPeriodEnd &&
      params.currentPeriodEnd.getTime() > referenceDate.getTime()
  )
}

export function getPlanState(
  params: {
    plan: Plan | null | undefined
    createdAt?: Date | null
    status?: SubscriptionStatus | null
    currentPeriodEnd?: Date | null
  },
  referenceDate = new Date()
) {
  const selfHostedPlan = getSelfHostedPlanOverride()

  if (selfHostedPlan) {
    return {
      storedPlan: selfHostedPlan,
      effectivePlan: selfHostedPlan,
      isTrialActive: false,
      isTrialExpired: false,
      trialEndsAt: null,
      trialDaysRemaining: 0,
      displayLabel: getDisplayLabel(selfHostedPlan),
    }
  }

  const storedPlan = params.plan ?? "FREE"
  const hasPaidAccess = hasActivePaidBillingAccess(params, referenceDate)

  if (storedPlan !== "FREE" && params.status === "TRIALING") {
    const trialEndsAt =
      params.currentPeriodEnd ??
      new Date((params.createdAt ?? referenceDate).getTime() + FREE_TRIAL_DAYS * DAY_IN_MS)
    const millisecondsRemaining = trialEndsAt.getTime() - referenceDate.getTime()
    const isTrialActive = millisecondsRemaining > 0

    return {
      storedPlan,
      effectivePlan: isTrialActive ? storedPlan : ("FREE" as const),
      isTrialActive,
      isTrialExpired: !isTrialActive,
      trialEndsAt,
      trialDaysRemaining: isTrialActive
        ? Math.ceil(millisecondsRemaining / DAY_IN_MS)
        : 0,
      displayLabel: isTrialActive ? "Trial" : PLAN_LABELS.FREE,
    }
  }

  if (storedPlan !== "FREE" && hasPaidAccess) {
    return {
      storedPlan,
      effectivePlan: storedPlan,
      isTrialActive: false,
      isTrialExpired: false,
      trialEndsAt: null,
      trialDaysRemaining: 0,
      displayLabel: getDisplayLabel(storedPlan),
    }
  }

  return {
    storedPlan,
    effectivePlan: "FREE" as const,
    isTrialActive: false,
    isTrialExpired: false,
    trialEndsAt: null,
    trialDaysRemaining: 0,
    displayLabel: getDisplayLabel("FREE"),
  }
}

export function hasActiveBillingAccess(
  params: {
    plan: Plan | null | undefined
    createdAt?: Date | null
    status?: SubscriptionStatus | null
    currentPeriodEnd?: Date | null
  },
  referenceDate = new Date()
) {
  return hasActivePaidBillingAccess(params, referenceDate)
}

export function getPlanFromSubscription(sub: Subscription | null): PlanConfig {
  const planState = getPlanState({
    plan: sub?.plan,
    createdAt: sub?.createdAt,
    status: sub?.status,
    currentPeriodEnd: sub?.currentPeriodEnd,
  })

  return PLANS[planState.effectivePlan] ?? PLANS.FREE
}

const PLAN_WEIGHT: Record<Plan, number> = {
  FREE: 0,
  PRO: 1,
  STUDIO: 2,
}

export function getHighestPlan(
  plans: Array<Plan | null | undefined>
): Plan {
  const selfHostedPlan = getSelfHostedPlanOverride()
  if (selfHostedPlan) {
    return selfHostedPlan
  }

  return plans.reduce<Plan>((highestPlan, candidatePlan) => {
    const resolvedPlan = candidatePlan ?? "FREE"

    if (PLAN_WEIGHT[resolvedPlan] > PLAN_WEIGHT[highestPlan]) {
      return resolvedPlan
    }

    return highestPlan
  }, "FREE")
}

export function getOwnedOrganizationSummary(params: {
  ownedOrganizationsCount: number
  subscription: Subscription | null
}) {
  const planState = getPlanState({
    plan: params.subscription?.plan,
    createdAt: params.subscription?.createdAt,
    status: params.subscription?.status,
    currentPeriodEnd: params.subscription?.currentPeriodEnd,
  })
  const hasActivePlan = hasActiveBillingAccess({
    plan: params.subscription?.plan,
    createdAt: params.subscription?.createdAt,
    status: params.subscription?.status,
    currentPeriodEnd: params.subscription?.currentPeriodEnd,
  })
  const maxOrganizations = PLANS[planState.effectivePlan].maxOrganizations

  return {
    accountPlan: planState.storedPlan,
    effectivePlan: planState.effectivePlan,
    displayPlanLabel: planState.displayLabel,
    isTrialActive: planState.isTrialActive,
    isTrialExpired: planState.isTrialExpired,
    trialEndsAt: planState.trialEndsAt,
    trialDaysRemaining: planState.trialDaysRemaining,
    hasActivePlan,
    maxOrganizations,
    ownedOrganizationsCount: params.ownedOrganizationsCount,
    canCreateOrganization:
      params.ownedOrganizationsCount === 0 ||
      (hasActivePlan &&
        (!Number.isFinite(maxOrganizations) ||
          params.ownedOrganizationsCount < maxOrganizations)),
  }
}
