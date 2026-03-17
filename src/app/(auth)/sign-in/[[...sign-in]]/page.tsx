import { SignIn } from "@clerk/nextjs"
import AuthShell, { AUTH_APPEARANCE } from "@/components/auth-shell"

function getSafeRedirectUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  if (!candidate || !candidate.startsWith("/")) {
    return "/dashboard"
  }

  return candidate
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const redirectUrl = getSafeRedirectUrl(resolvedSearchParams.redirect_url)
  const signUpHref = `/register?redirect_url=${encodeURIComponent(redirectUrl)}`

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
