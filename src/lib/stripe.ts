import Stripe from "stripe"
import type { Subscription, Plan, SubscriptionStatus } from "@prisma/client"
import type { ModuleId } from "@/types"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
})

export type PaidPlan = Exclude<Plan, "FREE">
export const FREE_TRIAL_DAYS = 7
const DAY_IN_MS = 1000 * 60 * 60 * 24

export const PLAN_LABELS: Record<Plan, string> = {
  FREE: "No active plan",
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
  PRO: process.env.STRIPE_PRICE_PRO,
  STUDIO: process.env.STRIPE_PRICE_STUDIO,
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
  const storedPlan = params.plan ?? "FREE"

  if (storedPlan !== "FREE" && params.status === "TRIALING") {
    const trialEndsAt =
      params.currentPeriodEnd ??
      new Date((params.createdAt ?? referenceDate).getTime() + FREE_TRIAL_DAYS * DAY_IN_MS)
    const millisecondsRemaining = trialEndsAt.getTime() - referenceDate.getTime()
    const isTrialActive = millisecondsRemaining > 0

    return {
      storedPlan,
      effectivePlan: storedPlan,
      isTrialActive,
      isTrialExpired: !isTrialActive,
      trialEndsAt,
      trialDaysRemaining: isTrialActive
        ? Math.ceil(millisecondsRemaining / DAY_IN_MS)
        : 0,
      displayLabel: isTrialActive ? "Trial" : PLAN_LABELS[storedPlan],
    }
  }

  if (storedPlan !== "FREE") {
    return {
      storedPlan,
      effectivePlan: storedPlan,
      isTrialActive: false,
      isTrialExpired: false,
      trialEndsAt: null,
      trialDaysRemaining: 0,
      displayLabel: PLAN_LABELS[storedPlan],
    }
  }

  return {
    storedPlan,
    effectivePlan: "FREE" as const,
    isTrialActive: false,
    isTrialExpired: false,
    trialEndsAt: null,
    trialDaysRemaining: 0,
    displayLabel: PLAN_LABELS.FREE,
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
  const planState = getPlanState(params, referenceDate)

  if (planState.isTrialActive) {
    return true
  }

  if (planState.storedPlan === "FREE") {
    return false
  }

  if (!params.status || params.status === "ACTIVE") {
    return true
  }

  return Boolean(
    params.currentPeriodEnd &&
      params.currentPeriodEnd.getTime() > referenceDate.getTime()
  )
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
      hasActivePlan &&
      (!Number.isFinite(maxOrganizations) ||
        params.ownedOrganizationsCount < maxOrganizations),
  }
}

export function getPriceIdForPlan(plan: PaidPlan) {
  const priceId = STRIPE_PRICE_IDS[plan]

  if (!priceId) {
    throw new Error(`Missing Stripe price ID for ${plan}`)
  }

  return priceId
}

export function getPlanFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "FREE"
  if (priceId === STRIPE_PRICE_IDS.PRO) return "PRO"
  if (priceId === STRIPE_PRICE_IDS.STUDIO) return "STUDIO"
  return "FREE"
}
