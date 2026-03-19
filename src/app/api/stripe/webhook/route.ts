import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { syncSubscriptionFromStripe } from "@/lib/billing"
import { stripe } from "@/lib/stripe"
import { sendTrialExpiryEmail, sendPaymentFailedEmail } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { createLogger } from "@/lib/logger"

const log = createLogger("stripe/webhook")

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature")

  const { env } = await import("@/lib/env.server")
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
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
      env.STRIPE_WEBHOOK_SECRET
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

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

        if (customerId) {
          const dbSub = await prisma.subscription.findUnique({
            where: { stripeCustomerId: customerId },
            include: { user: true },
          })

          if (dbSub?.user) {
            const nextAttempt = (invoice as { next_payment_attempt?: number | null }).next_payment_attempt
            await sendPaymentFailedEmail({
              to: dbSub.user.email,
              name: dbSub.user.name ?? "",
              amountDue: invoice.amount_due,
              currency: invoice.currency,
              nextAttemptAt: nextAttempt ? new Date(nextAttempt * 1000) : null,
            })
          }
        }
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id

        if (customerId) {
          const dbSub = await prisma.subscription.findUnique({
            where: { stripeCustomerId: customerId },
          })
          if (dbSub) {
            await prisma.subscription.update({
              where: { id: dbSub.id },
              data: { status: "ACTIVE" },
            })
          }
        }
        break
      }

      case "customer.subscription.paused": {
        const sub = event.data.object as Stripe.Subscription
        await syncSubscriptionFromStripe(sub)
        break
      }

      default:
        log.info("Unhandled Stripe event", { type: event.type })
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    log.error("Webhook processing failed", {}, err instanceof Error ? err : undefined)
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    )
  }
}
