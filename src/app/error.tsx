"use client"

import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
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
    <div className="min-h-screen bg-[#1a1a1a] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="w-full rounded-[24px] border border-[#2a2a2a] bg-[#222222] p-8 text-center md:p-12">
          <p className="rd-label text-[#f87171]">Error 500</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Something went wrong
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#9ca3af]">
            An unexpected error occurred. Our team has been notified.
            {error.digest && (
              <span className="mt-2 block text-xs text-[#666]">
                Error ID: {error.digest}
              </span>
            )}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={reset} className="rd-button-primary">
              Try again
            </button>
            <Link href="/" className="rd-button-secondary">
              Go home
            </Link>
            <Link href="/dashboard" className="rd-button-secondary">
              Open dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
