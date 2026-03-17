import type {
  Plan,
  Subscription,
  SubscriptionStatus,
  User,
} from "@prisma/client"
import type Stripe from "stripe"
import { prisma } from "@/lib/prisma"
import { canManageBilling } from "@/lib/org-members"
import {
  hasActiveBillingAccess,
  getPlanState,
  PLANS,
  getPlanFromPriceId,
  stripe,
} from "@/lib/stripe"
import type { ModuleId } from "@/types"

const PLACEHOLDER_CUSTOMER_PREFIX = "placeholder_"

export { canManageBilling }

export type BillingUsageSummary = {
  plan: Plan
  effectivePlan: Plan
  displayPlanLabel: string
  maxGames: number
  maxOrganizations: number
  totalGamesCount: number
  currentOrgGamesCount: number
  ownedOrganizationsCount: number
  availableModules: ModuleId[]
  canCreateGame: boolean
  canCreateOrganization: boolean
  isOverGameLimit: boolean
  isOverOrganizationLimit: boolean
  isOverLimit: boolean
  isTrialActive: boolean
  isTrialExpired: boolean
  trialEndsAt: Date | null
  trialDaysRemaining: number
  hasActivePlan: boolean
}

function hasRealStripeCustomerId(customerId: string | null | undefined) {
  return Boolean(
    customerId && !customerId.startsWith(PLACEHOLDER_CUSTOMER_PREFIX)
  )
}

function mapStripeStatusToSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE"
    case "trialing":
      return "TRIALING"
    case "canceled":
      return "CANCELED"
    default:
      return "PAST_DUE"
  }
}

function hasCapacity(limit: number, count: number) {
  return !Number.isFinite(limit) || count < limit
}

export async function getBillingUsageSummary(params: {
  billingOwnerId: string
  subscription: Subscription | null
  currentOrgId?: string
}): Promise<BillingUsageSummary> {
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
  const planConfig = PLANS[planState.effectivePlan]

  const [ownedOrganizationsCount, totalGamesCount, currentOrgGamesCount] =
    await Promise.all([
      prisma.organization.count({
        where: { billingOwnerId: params.billingOwnerId },
      }),
      prisma.game.count({
        where: {
          org: { billingOwnerId: params.billingOwnerId },
        },
      }),
      params.currentOrgId
        ? prisma.game.count({
            where: { orgId: params.currentOrgId },
          })
        : Promise.resolve(0),
    ])

  const isOverGameLimit =
    Number.isFinite(planConfig.maxGames) &&
    totalGamesCount > planConfig.maxGames
  const isOverOrganizationLimit =
    Number.isFinite(planConfig.maxOrganizations) &&
    ownedOrganizationsCount > planConfig.maxOrganizations

  return {
    plan: planState.storedPlan,
    effectivePlan: planState.effectivePlan,
    displayPlanLabel: planState.displayLabel,
    maxGames: planConfig.maxGames,
    maxOrganizations: planConfig.maxOrganizations,
    totalGamesCount,
    currentOrgGamesCount,
    ownedOrganizationsCount,
    availableModules: planConfig.modules,
    canCreateGame:
      hasActivePlan && hasCapacity(planConfig.maxGames, totalGamesCount),
    canCreateOrganization:
      hasActivePlan &&
      hasCapacity(planConfig.maxOrganizations, ownedOrganizationsCount),
    isOverGameLimit,
    isOverOrganizationLimit,
    isOverLimit: isOverGameLimit || isOverOrganizationLimit,
    isTrialActive: planState.isTrialActive,
    isTrialExpired: planState.isTrialExpired,
    trialEndsAt: planState.trialEndsAt,
    trialDaysRemaining: planState.trialDaysRemaining,
    hasActivePlan,
  }
}

export function getUnavailableModulesForPlan(params: {
  selectedModules: string[]
  subscription: Subscription | null
}) {
  const planState = getPlanState({
    plan: params.subscription?.plan,
    createdAt: params.subscription?.createdAt,
    status: params.subscription?.status,
    currentPeriodEnd: params.subscription?.currentPeriodEnd,
  })
  const allowedModules = new Set(PLANS[planState.effectivePlan].modules)

  return params.selectedModules.filter((moduleId) => !allowedModules.has(moduleId as ModuleId))
}

export async function ensureStripeCustomerForUser(params: {
  subscription: Subscription | null
  dbUser: User
}) {
  const { subscription, dbUser } = params

  if (subscription && hasRealStripeCustomerId(subscription.stripeCustomerId)) {
    return subscription
  }

  const customer = await stripe.customers.create({
    email: dbUser.email || undefined,
    name: dbUser.name || dbUser.email,
    metadata: {
      dbUserId: dbUser.id,
      clerkId: dbUser.clerkId,
    },
  })

  if (subscription) {
    return prisma.subscription.update({
      where: { userId: dbUser.id },
      data: {
        stripeCustomerId: customer.id,
      },
    })
  }

  return prisma.subscription.create({
    data: {
      userId: dbUser.id,
      stripeCustomerId: customer.id,
      plan: "FREE",
      status: "CANCELED",
    },
  })
}

export async function syncSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
) {
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : stripeSubscription.customer.id

  const priceId = stripeSubscription.items.data[0]?.price.id ?? null
  const plan = getPlanFromPriceId(priceId)
  const status = mapStripeStatusToSubscriptionStatus(stripeSubscription.status)
  const currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end
    ? new Date(stripeSubscription.items.data[0].current_period_end * 1000)
    : null

  const existing = await prisma.subscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: stripeSubscription.id },
        { stripeCustomerId: customerId },
      ],
    },
  })

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        plan,
        status,
        currentPeriodEnd,
      },
    })
  }

  const userId = stripeSubscription.metadata.dbUserId
  if (!userId) {
    return null
  }

  return prisma.subscription.upsert({
    where: { userId },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      plan,
      status,
      currentPeriodEnd,
    },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: stripeSubscription.id,
      plan,
      status,
      currentPeriodEnd,
    },
  })
}
