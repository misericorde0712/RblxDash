import AuthShell, { AUTH_APPEARANCE } from "@/components/auth-shell"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Create Account",
  description: "Secure account creation for new RblxDash users.",
  path: "/sign-up",
  noIndex: true,
})

function getSafeRedirectUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  if (!candidate || !candidate.startsWith("/")) {
    return "/onboarding"
  }

  return candidate
}

function getErrorMessage(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  switch (candidate) {
    case "missing-fields":
      return "Name, email, and password are required."
    case "invalid-email":
      return "Enter a valid email address."
    case "weak-password":
      return "Use at least 8 characters for the password."
    case "exists":
      return "An account already exists for this email. Sign in instead."
    default:
      return null
  }
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const redirectUrl = getSafeRedirectUrl(resolvedSearchParams.redirect_url)
  const signInHref = `/login?redirect_url=${encodeURIComponent(redirectUrl)}`
  const errorMessage = getErrorMessage(resolvedSearchParams.error)
  const selfHostedMode = isSelfHostedMode()

  if (selfHostedMode) {
    return (
      <AuthShell
        eyebrow="Get started"
        title="Start your self-hosted RblxDash setup"
        description="Create the first local account for this deployment, then connect your Roblox game and start tracking live events, analytics, and moderation."
        switchLabel="Already have an account?"
        switchHref={signInHref}
        switchText="Sign in"
        topLinkHref="/#pricing"
        topLinkLabel="View pricing"
      >
        <form action="/api/local-auth/sign-up" method="POST" className="space-y-4">
          <input type="hidden" name="redirect_url" value={redirectUrl} />

          {errorMessage ? (
            <div className="rounded-lg border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fecaca]">
              {errorMessage}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#d1d5db]" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2.5 text-white placeholder:text-[#888888] focus:border-[#e8822a] focus:outline-none"
              placeholder="Studio owner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#d1d5db]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2.5 text-white placeholder:text-[#888888] focus:border-[#e8822a] focus:outline-none"
              placeholder="you@studio.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[#d1d5db]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2.5 text-white placeholder:text-[#888888] focus:border-[#e8822a] focus:outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#e8822a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f1913f]"
          >
            Create account
          </button>

          <p className="text-xs leading-5 text-[#666666]">
            This self-hosted deployment stores a local password hash and does not depend on Clerk.
          </p>
        </form>
      </AuthShell>
    )
  }

  const { SignUp } = await import("@clerk/nextjs")

  return (
    <AuthShell
      eyebrow="Get started"
      title="Start your 7-day RblxDash trial"
      description="Create your account, start your 7-day trial, then connect your Roblox game and start tracking live events, analytics, and moderation."
      switchLabel="Already have an account?"
      switchHref={signInHref}
      switchText="Sign in"
      topLinkHref="/#pricing"
      topLinkLabel="View pricing"
    >
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl={signInHref}
        fallbackRedirectUrl={redirectUrl}
        appearance={AUTH_APPEARANCE}
      />
    </AuthShell>
  )
}
