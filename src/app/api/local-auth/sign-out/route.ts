import { NextResponse } from "next/server"
import { getClearedLocalAuthSessionCookie } from "@/lib/local-auth"
import {
  getClearedCurrentGameCookie,
  getClearedCurrentOrgCookie,
} from "@/lib/auth"

export async function POST(req: Request) {
  const response = NextResponse.redirect(new URL("/", req.url), { status: 303 })

  response.cookies.set(getClearedLocalAuthSessionCookie())
  response.cookies.set(getClearedCurrentOrgCookie())
  response.cookies.set(getClearedCurrentGameCookie())

  return response
}
