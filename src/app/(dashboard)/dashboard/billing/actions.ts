"use server"

import { currentUser } from "@clerk/nextjs/server"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { upsertDbUserFromClerkUser } from "@/lib/auth"
import { ensureStripeCustomerForUser } from "@/lib/billing"
import { getRequestOrigin } from "@/lib/request-url"
import {
  FREE_TRIAL_DAYS,
  getPlanState,
  getPriceIdForPlan,
  stripe,
} from "@/lib/stripe"
import type { PaidPlan } from "@/lib/stripe"

function getAppUrl(headersList: Awaited<ReturnType<typeof headers>>) {
  return getRequestOrigin({
    headers: headersList,
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  })
}

export async function redirectToBillingPortal() {
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

export async function redirectToCheckout(plan: PaidPlan) {
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

  const headersList = await headers()
  const appUrl = getAppUrl(headersList)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: syncedSubscription.stripeCustomerId,
    client_reference_id: dbUser.id,
    line_items: [{ price: getPriceIdForPlan(plan), quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { dbUserId: dbUser.id, source: "billing_page", plan },
    subscription_data: {
      metadata: { dbUserId: dbUser.id, source: "billing_page", plan },
      ...subscriptionTrialData,
    },
    success_url: `${appUrl}/dashboard/billing?success=1`,
    cancel_url: `${appUrl}/dashboard/billing?canceled=1`,
  })

  if (!session.url) redirect("/dashboard/billing?canceled=1")
  redirect(session.url)
}
