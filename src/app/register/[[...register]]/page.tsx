import { redirect } from "next/navigation"

export default async function RegisterPage({
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
      ? `/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`
      : "/sign-up"
  )
}
