"use server"

import { currentUser } from "@/lib/auth-provider/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { upsertDbUserFromClerkUser } from "@/lib/auth"
import { ensureStripeCustomerForUser } from "@/lib/billing"
import {
  isManagedBillingEnabled,
} from "@/lib/deployment-mode"
import { getRequestOrigin } from "@/lib/request-url"
import {
  FREE_TRIAL_DAYS,
  getPlanState,
  getPriceIdForPlan,
  stripe,
} from "@/lib/stripe"
import type { PaidPlan, BillingInterval } from "@/lib/stripe"

function getAppUrl(headersList: Awaited<ReturnType<typeof headers>>) {
  return getRequestOrigin({
    headers: headersList,
    url: process.env.NEXT_PUBLIC_APP_URL!,
  })
}

export async function redirectToBillingPortal() {
  if (!isManagedBillingEnabled()) {
    redirect("/dashboard/billing?billing=disabled")
  }

  const clerkUser = await currentUser()
  if (!clerkUser) redirect("/login")

  const dbUser = await upsertDbUserFromClerkUser(clerkUser)
  const accountSubscription = await prisma.subscription.findUnique({
    where: { userId: dbUser.id },
  })
  const syncedSubscription = await ensureStripeCustomerForUser({
    subscription: accountSubscription,
    dbUser,
  })

  const headersList = await headers()
  const appUrl = getAppUrl(headersList)

  const session = await stripe.billingPortal.sessions.create({
    customer: syncedSubscription.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  })

  redirect(session.url)
}

export async function redirectToCheckout(plan: PaidPlan, interval: BillingInterval = "monthly") {
  if (!isManagedBillingEnabled()) {
    redirect("/dashboard/billing?billing=disabled")
  }

  const clerkUser = await currentUser()
  if (!clerkUser) redirect("/login")

  const dbUser = await upsertDbUserFromClerkUser(clerkUser)
  const accountSubscription = await prisma.subscription.findUnique({
    where: { userId: dbUser.id },
  })
  const syncedSubscription = await ensureStripeCustomerForUser({
    subscription: accountSubscription,
    dbUser,
  })

  const headersList = await headers()
  const appUrl = getAppUrl(headersList)

  const priceId = getPriceIdForPlan(plan, interval)

  if (interval === "lifetime") {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer: syncedSubscription.stripeCustomerId,
      client_reference_id: dbUser.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { dbUserId: dbUser.id, source: "billing_page", plan, interval: "lifetime" },
      success_url: `${appUrl}/dashboard/billing?success=1`,
      cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
    })

    if (!session.url) redirect("/dashboard/billing?canceled=1")
    redirect(session.url)
  }

  const planState = getPlanState({
    plan: accountSubscription?.plan,
    createdAt: accountSubscription?.createdAt,
    status: accountSubscription?.status,
    currentPeriodEnd: accountSubscription?.currentPeriodEnd,
  })

  const trialEndTimestamp =
    planState.isTrialActive &&
    planState.trialEndsAt &&
    planState.trialEndsAt.getTime() > Date.now() + 60 * 1000
      ? Math.floor(planState.trialEndsAt.getTime() / 1000)
      : undefined
  const isNewSubscriber = !syncedSubscription.stripeSubscriptionId
  const subscriptionTrialData = trialEndTimestamp
    ? { trial_end: trialEndTimestamp }
    : isNewSubscriber
      ? { trial_period_days: FREE_TRIAL_DAYS }
      : {}

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: syncedSubscription.stripeCustomerId,
    client_reference_id: dbUser.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { dbUserId: dbUser.id, source: "billing_page", plan, interval },
    subscription_data: {
      metadata: { dbUserId: dbUser.id, source: "billing_page", plan, interval },
      ...subscriptionTrialData,
    },
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
  })

  if (!session.url) redirect("/dashboard/billing?canceled=1")
  redirect(session.url)
}
