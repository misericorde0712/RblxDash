"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#1a1a1a",
          color: "#fff",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: "24px",
        }}
      >
        <div
          style={{
            background: "#222",
            border: "1px solid #2a2a2a",
            borderRadius: "24px",
            padding: "48px",
            maxWidth: "480px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#f87171",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Fatal error
          </p>
          <h1 style={{ marginTop: "16px", fontSize: "28px", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "12px", color: "#9ca3af", fontSize: "15px", lineHeight: 1.6 }}>
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span style={{ display: "block", marginTop: "8px", fontSize: "12px", color: "#666" }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "10px 24px",
              background: "#e8822a",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
