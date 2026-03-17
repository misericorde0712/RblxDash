import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/account/", "/onboarding/", "/sign-in/", "/sign-up/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
