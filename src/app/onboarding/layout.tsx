import type { Metadata } from "next"
import { NO_INDEX_ROBOTS } from "@/lib/seo"

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Private onboarding workspace setup for RblxDash users.",
  robots: NO_INDEX_ROBOTS,
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
