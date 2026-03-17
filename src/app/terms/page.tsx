import LegalPage from "@/components/legal-page"

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms summarize the basic usage expectations for RblxDash."
      sections={[
        {
          title: "Service scope",
          body: "RblxDash is a hosted dashboard for Roblox game operations, analytics, player investigation, and moderation workflows. Features, pricing, and limits may evolve as the product matures.",
        },
        {
          title: "Your responsibilities",
          body: "You are responsible for the Roblox experiences you connect, the events you send, the moderation actions you trigger, and the secrets you install in your Roblox server code.",
        },
        {
          title: "Billing and limits",
          body: "Paid plans unlock higher game limits, longer retention, and extra product capabilities. Account-level limits apply according to the active plan shown inside the billing page. Subscriptions are billed monthly and can be cancelled at any time. No refunds are issued for partial billing periods.",
        },
        {
          title: "Availability",
          body: "RblxDash is a commercial SaaS product. We aim for high availability but do not guarantee uptime. Planned maintenance is communicated in advance. Features may evolve with notice.",
        },
        {
          title: "Communications",
          body: "By creating an account, you agree to receive transactional emails related to your account (billing, security, product updates). You can manage notification preferences from your account settings or contact support to unsubscribe.",
        },
      ]}
    />
  )
}
