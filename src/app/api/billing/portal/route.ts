import { NextRequest, NextResponse } from "next/server"
import { OrgRole } from "@prisma/client"
import { getCurrentOrgForRoute } from "@/lib/auth"
import { canManageBilling, ensureStripeCustomerForUser } from "@/lib/billing"
import { getRequestOrigin } from "@/lib/request-url"
import { stripe } from "@/lib/stripe"

export async function POST(req: NextRequest) {
  try {
    const currentOrgResult = await getCurrentOrgForRoute(req, OrgRole.MODERATOR)
    if ("response" in currentOrgResult) {
      return currentOrgResult.response
    }

    const { dbUser, member, accountSubscription, isBillingOwner } =
      currentOrgResult.context

    if (!canManageBilling(member.role) || !isBillingOwner) {
      return NextResponse.json(
        { error: "Only the billing owner can manage this account subscription" },
        { status: 403 }
      )
    }

    const syncedSubscription = await ensureStripeCustomerForUser({
      subscription: accountSubscription,
      dbUser,
    })

    const appUrl = getRequestOrigin(req)
    const session = await stripe.billingPortal.sessions.create({
      customer: syncedSubscription.stripeCustomerId,
      return_url: `${appUrl}/account`,
    })

    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error("[POST /api/billing/portal]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
