import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="w-full rounded-[24px] border border-[#2a2a2a] bg-[#222222] p-8 text-center md:p-12">
          <p className="rd-label text-[#e8822a]">
            Error 404
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            This page does not exist
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#9ca3af]">
            The link may be outdated, incomplete, or simply wrong. Go back to the
            homepage, sign in, or open the dashboard if you already have an account.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rd-button-primary"
            >
              Go home
            </Link>
            <Link
              href="/login"
              className="rd-button-secondary"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="rd-button-secondary"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
