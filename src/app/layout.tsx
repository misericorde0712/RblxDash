import type { Metadata, Viewport } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import {
  absoluteUrl,
  DEFAULT_DESCRIPTION,
  DEFAULT_KEYWORDS,
  INDEXABLE_ROBOTS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo"
import "./globals.css"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e8822a",
  colorScheme: "dark",
}

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  metadataBase: new URL(SITE_URL),
  keywords: DEFAULT_KEYWORDS,
  category: "software",
  referrer: "origin-when-cross-origin",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: "/manifest.json",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-icon" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    images: [absoluteUrl("/opengraph-image")],
  },
  robots: INDEXABLE_ROBOTS,
}

async function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  if (isSelfHostedMode()) {
    return children
  }

  const { ClerkProvider } = await import("@clerk/nextjs")
  return <ClerkProvider>{children}</ClerkProvider>
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        <AppProviders>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AppProviders>
      </body>
    </html>
  )
}
