import LegalPage from "@/components/legal-page"

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This page explains, at a high level, what RblxDash stores to run the service and what remains under your control as a Roblox developer."
      sections={[
        {
          title: "What RblxDash stores",
          body: "RblxDash stores account data, workspace memberships, connected game settings, webhook events, tracked players, moderation history, and billing information needed to operate the dashboard.",
        },
        {
          title: "Roblox game data",
          body: "RblxDash stores the events your Roblox server code sends to the service. This can include joins, leaves, server heartbeats, gameplay events, economy data, progression steps, and moderation acknowledgements.",
        },
        {
          title: "Credentials and secrets",
          body: "Per-game webhook secrets are stored for integration security. Open Cloud keys are encrypted server-side before storage. You are responsible for keeping your Roblox-side scripts and any copied secrets private.",
        },
        {
          title: "Access and retention",
          body: "Access to dashboard data is controlled through account access, workspace roles, and billing ownership. Log retention depends on the active plan shown in the product pricing.",
        },
      ]}
    />
  )
}
