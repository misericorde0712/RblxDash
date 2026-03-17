import { SignUp } from "@clerk/nextjs"
import AuthShell, { AUTH_APPEARANCE } from "@/components/auth-shell"

function getSafeRedirectUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  if (!candidate || !candidate.startsWith("/")) {
    return "/onboarding"
  }

  return candidate
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const redirectUrl = getSafeRedirectUrl(resolvedSearchParams.redirect_url)
  const signInHref = `/login?redirect_url=${encodeURIComponent(redirectUrl)}`

  return (
    <AuthShell
      eyebrow="Get started"
      title="Start your 7-day Dashblox trial"
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
