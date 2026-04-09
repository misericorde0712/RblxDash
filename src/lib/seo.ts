import type { Metadata } from "next"

const FALLBACK_SITE_URL = "https://rblxdash.com"

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return FALLBACK_SITE_URL
  }

  try {
    return new URL(value).toString().replace(/\/$/, "")
  } catch {
    return FALLBACK_SITE_URL
  }
}

export const SITE_NAME = "RblxDash"
export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL)
export const SUPPORT_EMAIL = "support@rblxdash.com"
export const GITHUB_URL = "https://github.com/misericorde0712/RblxDash"
export const DEFAULT_OG_IMAGE = "/opengraph-image"
export const DEFAULT_DESCRIPTION =
  "RblxDash helps Roblox studios monitor live servers, analyze player behavior, manage moderation, schedule live events, and track economy data from one open source dashboard."
export const DEFAULT_KEYWORDS = [
  "Roblox analytics",
  "Roblox live ops",
  "Roblox moderation tools",
  "Roblox dashboard",
  "Roblox game analytics",
  "Roblox server monitoring",
  "Roblox SaaS",
  "live event management",
  "economy tracking",
  "player analytics",
]

function buildMetaTitle(title: string) {
  return title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`
}

export function absoluteUrl(path = "/") {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`
  return `${SITE_URL}${normalizedPath}`
}

export const INDEXABLE_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
} satisfies NonNullable<Metadata["robots"]>

export const NO_INDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
    "max-image-preview": "none",
    "max-snippet": 0,
    "max-video-preview": 0,
  },
} satisfies NonNullable<Metadata["robots"]>

type PageMetadataOptions = {
  title: string
  description: string
  path?: string
  keywords?: string[]
  image?: string
  noIndex?: boolean
  type?: "website" | "article"
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_OG_IMAGE,
  noIndex = false,
  type = "website",
}: PageMetadataOptions): Metadata {
  const fullTitle = buildMetaTitle(title)
  const url = absoluteUrl(path)
  const imageUrl = absoluteUrl(image)

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      locale: "en_US",
      url,
      siteName: SITE_NAME,
      title: fullTitle,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
    robots: noIndex ? NO_INDEX_ROBOTS : INDEXABLE_ROBOTS,
  }
}

export function getOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/icon"),
    email: SUPPORT_EMAIL,
    sameAs: [GITHUB_URL],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SUPPORT_EMAIL,
        url: absoluteUrl("/contact"),
        availableLanguage: ["en", "fr"],
      },
    ],
  }
}

export function getWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
  }
}

export function getSoftwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web browser",
    isAccessibleForFree: true,
    description: DEFAULT_DESCRIPTION,
    softwareHelp: absoluteUrl("/contact"),
    codeRepository: GITHUB_URL,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "CAD",
      lowPrice: "0",
      highPrice: "40",
      offerCount: 3,
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "CAD",
          availability: "https://schema.org/InStock",
          url: absoluteUrl("/#pricing"),
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "15",
          priceCurrency: "CAD",
          availability: "https://schema.org/InStock",
          url: absoluteUrl("/start-trial"),
        },
        {
          "@type": "Offer",
          name: "Studio",
          price: "40",
          priceCurrency: "CAD",
          availability: "https://schema.org/InStock",
          url: absoluteUrl("/start-trial"),
        },
      ],
    },
    featureList: [
      "Live server monitoring",
      "Player analytics",
      "Moderation workflows",
      "Live config updates",
      "Live event scheduling",
      "Economy tracking",
      "REST API access",
      "Discord alerts",
    ],
  }
}
