/**
 * Helper to build NextRequest-like objects for route tests.
 */
export function buildRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
  } = {}
) {
  const { method = "POST", headers = {}, body } = options

  return new Request(url, {
    method,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}
