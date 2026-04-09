import { JsonLd } from "@/components/json-ld"
import MarketingHome from "@/components/marketing-home"
import {
  createPageMetadata,
  getOrganizationJsonLd,
  getSoftwareApplicationJsonLd,
  getWebsiteJsonLd,
} from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Roblox Analytics, Live Ops & Moderation Dashboard",
  description:
    "RblxDash is an open source SaaS for Roblox studios to monitor live servers, analyze players, manage moderation, schedule live events, and track economy data from one dashboard.",
  path: "/",
  keywords: [
    "Roblox analytics dashboard",
    "Roblox moderation SaaS",
    "Roblox live ops software",
    "Roblox server monitoring",
    "Roblox player analytics",
    "Roblox economy tracking",
    "open source SaaS",
  ],
})

const HOME_FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Does it work with any Roblox game?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. You paste a single script in your game and point it at your webhook URL. Any Roblox game can use it regardless of genre.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to republish my game to update?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Only when you first install the script or when you update it. The dashboard, webhook, live config, and live events update in real time without republishing.",
      },
    },
    {
      "@type": "Question",
      name: "Is the code really open source?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. The dashboard, webhook handler, Luau SDK, and analytics engine are available on GitHub for auditing, self-hosting, and contributions.",
      },
    },
    {
      "@type": "Question",
      name: "Can I track multiple games?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Pro supports up to 3 games and Studio supports unlimited games, each with its own webhook, dashboard, and data.",
      },
    },
  ],
}

export default function Home() {
  return (
    <>
      <JsonLd data={getOrganizationJsonLd()} />
      <JsonLd data={getWebsiteJsonLd()} />
      <JsonLd data={getSoftwareApplicationJsonLd()} />
      <JsonLd data={HOME_FAQ_JSON_LD} />
      <MarketingHome />
    </>
  )
}
