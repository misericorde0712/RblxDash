"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="rd-page-enter flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#2a2a2a] bg-[#222222] p-8 text-center">
        <p className="rd-label text-[#f87171]">Dashboard error</p>
        <h2 className="mt-4 text-2xl font-semibold text-white">
          Something went wrong
        </h2>
        <p className="mt-3 text-sm text-[#9ca3af]">
          This page encountered an error. Your data is safe.
          {error.digest && (
            <span className="mt-2 block text-xs text-[#666]">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="rd-button-primary">
            Retry
          </button>
          <a href="/dashboard" className="rd-button-secondary">
            Back to overview
          </a>
        </div>
      </div>
    </div>
  )
}
