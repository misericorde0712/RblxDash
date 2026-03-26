import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Empêche le clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Empêche le MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Contrôle le Referrer
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Permissions Policy (désactive caméra, micro, géoloc, etc.)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Strict Transport Security (1 an, includeSubDomains)
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.rblxdash.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://api.fontshare.com",
              "font-src 'self' https://cdn.fontshare.com",
              "img-src 'self' data: blob: https://*.roblox.com https://tr.rbxcdn.com https://thumbnails.roblox.com https://img.clerk.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://clerk.rblxdash.com https://api.stripe.com https://*.roblox.com https://api.resend.com https://*.sentry.io https://*.ingest.sentry.io",
              "frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.rblxdash.com https://challenges.cloudflare.com",
              "object-src 'none'",
              "base-uri 'self'",
              "worker-src 'self' blob:",
              "form-action 'self' https://billing.stripe.com https://checkout.stripe.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
      {
        // Headers CORS pour l'API v1 publique
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "rblxdash",
  project: process.env.SENTRY_PROJECT ?? "rblxdash-web",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
