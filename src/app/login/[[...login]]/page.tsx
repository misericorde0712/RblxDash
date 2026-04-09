import { createPageMetadata } from "@/lib/seo"
import { redirect } from "next/navigation"

export const metadata = createPageMetadata({
  title: "Login",
  description: "Redirecting to the private RblxDash sign-in flow.",
  path: "/login",
  noIndex: true,
})

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = (await searchParams) ?? {}
  const redirectUrl = Array.isArray(resolvedSearchParams.redirect_url)
    ? resolvedSearchParams.redirect_url[0]
    : resolvedSearchParams.redirect_url

  redirect(
    redirectUrl?.startsWith("/")
      ? `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
      : "/sign-in"
  )
}
