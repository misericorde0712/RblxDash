import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { syncSubscriptionFromStripe } from "@/lib/billing"
import { stripe } from "@/lib/stripe"
import { sendTrialExpiryEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing Stripe webhook configuration" },
      { status: 400 }
    )
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscriptionFromStripe(event.data.object as Stripe.Subscription)
        break

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription
        const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null

        if (trialEndsAt) {
          const dbSub = await prisma.subscription.findUnique({
            where: { stripeCustomerId: sub.customer as string },
            include: { user: true },
          })

          if (dbSub?.user) {
            await sendTrialExpiryEmail({
              to: dbSub.user.email,
              name: dbSub.user.name ?? "",
              trialEndsAt,
            })
          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[POST /api/stripe/webhook]", err)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }
}
