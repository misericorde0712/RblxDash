"use client"

import { SignOutButton } from "@clerk/nextjs"
import type { ReactElement } from "react"

export default function HostedSignOutButton({
  children,
}: {
  children: ReactElement
}) {
  return <SignOutButton redirectUrl="/">{children}</SignOutButton>
}
