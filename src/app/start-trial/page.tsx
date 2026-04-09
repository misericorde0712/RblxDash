import { currentUser } from "@/lib/auth-provider/server"
import { redirect } from "next/navigation"
import { getDbUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isManagedBillingEnabled } from "@/lib/deployment-mode"
import { createPageMetadata } from "@/lib/seo"
import { hasActiveBillingAccess } from "@/lib/stripe"
import StartTrialClient from "./start-trial-client"

export const metadata = createPageMetadata({
  title: "Start Free Trial",
  description: "Start a private RblxDash trial session and launch your subscription checkout.",
  path: "/start-trial",
  noIndex: true,
})

export default async function StartTrialPage() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    redirect(
      isManagedBillingEnabled() ? "/sign-up?redirect_url=/start-trial" : "/register"
    )
  }

  const syncedDbUser = await getDbUser(clerkUser)
  const dbUser = syncedDbUser
    ? await prisma.user.findUnique({
        where: { id: syncedDbUser.id },
        select: {
          subscription: {
            select: { plan: true, createdAt: true, status: true, currentPeriodEnd: true },
          },
          memberships: { select: { id: true }, take: 1 },
        },
      })
    : null

  const hasRealSubscription = hasActiveBillingAccess({
    plan: dbUser?.subscription?.plan,
    createdAt: dbUser?.subscription?.createdAt,
    status: dbUser?.subscription?.status,
    currentPeriodEnd: dbUser?.subscription?.currentPeriodEnd,
  })

  if (!isManagedBillingEnabled()) {
    redirect(dbUser?.memberships.length ? "/dashboard" : "/onboarding")
  }

  if (hasRealSubscription) {
    redirect(dbUser?.memberships.length ? "/dashboard" : "/onboarding")
  }

  return <StartTrialClient />
}
