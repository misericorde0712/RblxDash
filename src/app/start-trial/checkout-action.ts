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
  getPriceIdForPlan,
  hasActiveBillingAccess,
  stripe,
} from "@/lib/stripe"

export async function createCheckoutSession() {
  const clerkUser = await currentUser()
  if (!clerkUser) {
    redirect("/sign-up?redirect_url=/start-trial")
  }

  const dbUser = await upsertDbUserFromClerkUser(clerkUser)
  const [accountSubscription, membershipsCount] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: dbUser.id } }),
    prisma.orgMember.count({ where: { userId: dbUser.id } }),
  ])

  const hasRealSubscription = hasActiveBillingAccess({
    plan: accountSubscription?.plan,
    createdAt: accountSubscription?.createdAt,
    status: accountSubscription?.status,
    currentPeriodEnd: accountSubscription?.currentPeriodEnd,
  })

  if (hasRealSubscription) {
    redirect(membershipsCount > 0 ? "/dashboard" : "/onboarding")
  }

  const syncedSubscription = await ensureStripeCustomerForUser({
    subscription: accountSubscription,
    dbUser,
  })

  const headerList = await headers()
  const appUrl = getRequestOrigin({
    headers: headerList,
    url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  })

  const successUrl =
    membershipsCount > 0
      ? `${appUrl}/account?success=1`
      : `${appUrl}/onboarding?trial=1`

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: syncedSubscription.stripeCustomerId,
    client_reference_id: dbUser.id,
    line_items: [{ price: getPriceIdForPlan("PRO"), quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { dbUserId: dbUser.id, source: "start_trial", plan: "PRO" },
    subscription_data: {
      trial_period_days: FREE_TRIAL_DAYS,
      metadata: { dbUserId: dbUser.id, source: "start_trial", plan: "PRO" },
    },
    success_url: successUrl,
    cancel_url: `${appUrl}/account?canceled=1`,
  })

  if (!session.url) {
    redirect("/account?canceled=1")
  }

  redirect(session.url)
}
