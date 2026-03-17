type RequestLike = {
  headers: Headers
  url: string
}

function getFirstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null
}

export function getRequestOrigin(req: RequestLike) {
  const forwardedHost = getFirstHeaderValue(req.headers.get("x-forwarded-host"))
  const host = getFirstHeaderValue(req.headers.get("host"))
  const forwardedProto = getFirstHeaderValue(
    req.headers.get("x-forwarded-proto")
  )
  const resolvedHost = forwardedHost ?? host

  if (resolvedHost) {
    const resolvedProto =
      forwardedProto ??
      (resolvedHost.startsWith("localhost") ||
      resolvedHost.startsWith("127.0.0.1")
        ? "http"
        : "https")

    return `${resolvedProto}://${resolvedHost}`
  }

  return process.env.NEXT_PUBLIC_APP_URL?.trim() ?? new URL(req.url).origin
}

export function toAbsoluteUrl(req: RequestLike, pathname: string) {
  return new URL(pathname, getRequestOrigin(req))
}
