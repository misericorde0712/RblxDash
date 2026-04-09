import AuthShell, { AUTH_APPEARANCE } from "@/components/auth-shell"
import { isSelfHostedMode } from "@/lib/deployment-mode"
import { createPageMetadata } from "@/lib/seo"

export const metadata = createPageMetadata({
  title: "Sign In",
  description: "Secure sign-in for existing RblxDash users.",
  path: "/sign-in",
  noIndex: true,
})

function getSafeRedirectUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  if (!candidate || !candidate.startsWith("/")) {
    return "/dashboard"
  }

  return candidate
}

function getErrorMessage(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  switch (candidate) {
    case "invalid":
      return "Incorrect email or password."
    default:
      return null
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const redirectUrl = getSafeRedirectUrl(resolvedSearchParams.redirect_url)
  const signUpHref = `/register?redirect_url=${encodeURIComponent(redirectUrl)}`
  const errorMessage = getErrorMessage(resolvedSearchParams.error)
  const selfHostedMode = isSelfHostedMode()

  if (selfHostedMode) {
    return (
      <AuthShell
        eyebrow="Welcome back"
        title="Sign in to your Roblox operations dashboard"
        description="Open your games, check live health, inspect players, and manage moderation from one place."
        switchLabel="Need a new account?"
        switchHref={signUpHref}
        switchText="Create an account"
        topLinkHref="/"
        topLinkLabel="Back home"
      >
        <form action="/api/local-auth/sign-in" method="POST" className="space-y-4">
          <input type="hidden" name="redirect_url" value={redirectUrl} />

          {errorMessage ? (
            <div className="rounded-lg border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#fecaca]">
              {errorMessage}
            </div>
          ) : null}

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
              autoComplete="current-password"
              className="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2.5 text-white placeholder:text-[#888888] focus:border-[#e8822a] focus:outline-none"
              placeholder="Your password"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#e8822a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f1913f]"
          >
            Sign in
          </button>

          <p className="text-xs leading-5 text-[#666666]">
            This self-hosted deployment uses built-in local email and password authentication.
          </p>
        </form>
      </AuthShell>
    )
  }

  const { SignIn } = await import("@clerk/nextjs")

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your Roblox operations dashboard"
      description="Open your games, check live health, inspect players, and manage moderation from one place."
      switchLabel="Need a new account?"
      switchHref={signUpHref}
      switchText="Create an account"
      topLinkHref="/"
      topLinkLabel="Back home"
    >
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl={signUpHref}
        fallbackRedirectUrl={redirectUrl}
        appearance={AUTH_APPEARANCE}
      />
    </AuthShell>
  )
}
