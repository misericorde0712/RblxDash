import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { upsertDbUserFromClerkUser } from "@/lib/auth"
import { ensureStripeCustomerForUser } from "@/lib/billing"
import { getRequestOrigin } from "@/lib/request-url"
import { getPlanState, getPriceIdForPlan, stripe } from "@/lib/stripe"

const CheckoutSchema = z.object({
  plan: z.enum(["PRO", "STUDIO"]),
})

export async function POST(req: NextRequest) {
  try {
    const clerkUser = await currentUser()

    if (!clerkUser) {
      return NextResponse.redirect(new URL("/login", req.url), { status: 303 })
    }

    const dbUser = await upsertDbUserFromClerkUser(clerkUser)
    const accountSubscription = await prisma.subscription.findUnique({
      where: { userId: dbUser.id },
    })

    const formData = await req.formData()
    const parsed = CheckoutSchema.safeParse({
      plan: formData.get("plan"),
    })

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid plan" },
        { status: 400 }
      )
    }

    const syncedSubscription = await ensureStripeCustomerForUser({
      subscription: accountSubscription,
      dbUser,
    })
    const plan = parsed.data.plan
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

    const appUrl = getRequestOrigin(req)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: syncedSubscription.stripeCustomerId,
      client_reference_id: dbUser.id,
      line_items: [
        {
          price: getPriceIdForPlan(plan),
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      metadata: {
        dbUserId: dbUser.id,
        source: "account_page",
        plan,
      },
      subscription_data: {
        metadata: {
          dbUserId: dbUser.id,
          source: "account_page",
          plan,
        },
        ...(trialEndTimestamp ? { trial_end: trialEndTimestamp } : {}),
      },
      success_url: `${appUrl}/account?success=1`,
      cancel_url: `${appUrl}/account?canceled=1`,
    })

    if (!session.url) {
      return NextResponse.json(
        { error: "Failed to create Stripe Checkout session" },
        { status: 500 }
      )
    }

    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error("[POST /api/account/billing/checkout]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
