import type { Metadata } from "next"
import { ClerkProvider } from "@clerk/nextjs"
import { ErrorBoundary } from "@/components/error-boundary"
import "./globals.css"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"

export const metadata: Metadata = {
  title: {
    default: "RblxDash — Game Operations for Roblox Studios",
    template: "%s | RblxDash",
  },
  description:
    "Live operations, analytics, player investigation, and moderation workflows for Roblox games. Open source.",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "RblxDash",
    title: "RblxDash — Game Operations for Roblox Studios",
    description:
      "Live metrics, player analytics, moderation, and economy tracking — all in one dashboard. Fully open source.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RblxDash — Game Operations for Roblox Studios",
    description:
      "Live metrics, player analytics, moderation, and economy tracking — all in one dashboard. Fully open source.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#e8822a" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
        </head>
        <body className="h-full antialiased">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  )
}
