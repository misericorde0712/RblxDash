import { isSelfHostedMode } from "@/lib/deployment-mode"
import {
  getLocalAuthUser,
  type AuthUser,
} from "@/lib/local-auth"

function toHostedAuthUser(
  user: NonNullable<
    Awaited<ReturnType<(typeof import("@clerk/nextjs/server"))["currentUser"]>>
  >
): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    emailAddresses: user.emailAddresses.map((emailAddress) => ({
      emailAddress: emailAddress.emailAddress,
    })),
    passwordEnabled: user.passwordEnabled,
  }
}

export async function currentUser(): Promise<AuthUser | null> {
  if (isSelfHostedMode()) {
    return getLocalAuthUser()
  }

  const { currentUser: clerkCurrentUser } = await import("@clerk/nextjs/server")
  const user = await clerkCurrentUser()
  return user ? toHostedAuthUser(user) : null
}

export async function auth(): Promise<{ userId: string | null }> {
  if (isSelfHostedMode()) {
    const user = await getLocalAuthUser()
    return {
      userId: user?.id ?? null,
    }
  }

  const { auth: clerkAuth } = await import("@clerk/nextjs/server")
  const result = await clerkAuth()
  return {
    userId: result.userId ?? null,
  }
}
