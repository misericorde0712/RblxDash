import LegalPage from "@/components/legal-page"

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms summarize the basic usage expectations for Dashblox during early access."
      sections={[
        {
          title: "Service scope",
          body: "Dashblox is a hosted dashboard for Roblox game operations, analytics, player investigation, and moderation workflows. Features, pricing, and limits may evolve as the product matures.",
        },
        {
          title: "Your responsibilities",
          body: "You are responsible for the Roblox experiences you connect, the events you send, the moderation actions you trigger, and the secrets you install in your Roblox server code.",
        },
        {
          title: "Billing and limits",
          body: "Paid plans unlock higher game limits, longer retention, and extra product capabilities. Account-level limits apply according to the active plan shown inside the billing page.",
        },
        {
          title: "Availability",
          body: "Dashblox is currently presented as an early access product. Features can change, and short maintenance windows or iterative product changes may happen as the service evolves.",
        },
      ]}
    />
  )
}
