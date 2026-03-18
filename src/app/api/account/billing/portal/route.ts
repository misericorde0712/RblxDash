import { NextRequest, NextResponse } from "next/server"
import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { upsertDbUserFromClerkUser } from "@/lib/auth"
import { ensureStripeCustomerForUser } from "@/lib/billing"
import { getRequestOrigin } from "@/lib/request-url"
import { stripe } from "@/lib/stripe"

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
    const syncedSubscription = await ensureStripeCustomerForUser({
      subscription: accountSubscription,
      dbUser,
    })

    const formData = await req.formData()
    const returnToRaw = formData.get("return_to") as string | null
    const returnTo =
      returnToRaw && returnToRaw.startsWith("/") && !returnToRaw.startsWith("//") && !returnToRaw.includes("://")
        ? returnToRaw
        : "/account"

    const appUrl = getRequestOrigin(req)
    const session = await stripe.billingPortal.sessions.create({
      customer: syncedSubscription.stripeCustomerId,
      return_url: `${appUrl}${returnTo}`,
    })

    return NextResponse.redirect(session.url, { status: 303 })
  } catch (err) {
    console.error("[POST /api/account/billing/portal]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
