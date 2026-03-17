import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { hasActiveBillingAccess } from "@/lib/stripe"
import StartTrialClient from "./start-trial-client"

export default async function StartTrialPage() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    redirect("/sign-up?redirect_url=/start-trial")
  }

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    select: {
      subscription: {
        select: { plan: true, createdAt: true, status: true, currentPeriodEnd: true },
      },
      memberships: { select: { id: true }, take: 1 },
    },
  })

  const hasRealSubscription =
    dbUser?.subscription &&
    hasActiveBillingAccess({
      plan: dbUser.subscription.plan,
      createdAt: dbUser.subscription.createdAt,
      status: dbUser.subscription.status,
      currentPeriodEnd: dbUser.subscription.currentPeriodEnd,
    })

  if (hasRealSubscription) {
    redirect(dbUser.memberships.length > 0 ? "/dashboard" : "/onboarding")
  }

  return <StartTrialClient />
}
