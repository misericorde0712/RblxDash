import "server-only"
import { prisma } from "@/lib/prisma"
import {
  buildRobloxProfileUrl,
  decryptRobloxOAuthSecret,
  encryptRobloxOAuthSecret,
  fetchRobloxUserInfo,
  getRobloxTokenExpiresAt,
  parseRobloxScopes,
  refreshRobloxAccessToken,
  type RobloxTokenResponse,
} from "@/lib/roblox-oauth"

async function persistRobloxConnectionFromToken(params: {
  userId: string
  tokenResponse: RobloxTokenResponse
}) {
  const userInfo = await fetchRobloxUserInfo(params.tokenResponse.access_token)
  const robloxUsername =
    userInfo.preferred_username || userInfo.nickname || userInfo.name || null
  const robloxDisplayName = userInfo.name || robloxUsername
  const profileUrl =
    userInfo.profile || (userInfo.sub ? buildRobloxProfileUrl(userInfo.sub) : null)

  return prisma.robloxConnection.upsert({
    where: { userId: params.userId },
    update: {
      robloxUserId: userInfo.sub,
      robloxUsername,
      robloxDisplayName,
      robloxProfileUrl: profileUrl,
      robloxAvatarUrl: userInfo.picture || null,
      scopes: parseRobloxScopes(params.tokenResponse.scope),
      accessToken: encryptRobloxOAuthSecret(params.tokenResponse.access_token),
      refreshToken: encryptRobloxOAuthSecret(params.tokenResponse.refresh_token),
      tokenType: params.tokenResponse.token_type || "Bearer",
      expiresAt: getRobloxTokenExpiresAt(params.tokenResponse.expires_in),
    },
    create: {
      userId: params.userId,
      robloxUserId: userInfo.sub,
      robloxUsername,
      robloxDisplayName,
      robloxProfileUrl: profileUrl,
      robloxAvatarUrl: userInfo.picture || null,
      scopes: parseRobloxScopes(params.tokenResponse.scope),
      accessToken: encryptRobloxOAuthSecret(params.tokenResponse.access_token),
      refreshToken: encryptRobloxOAuthSecret(params.tokenResponse.refresh_token),
      tokenType: params.tokenResponse.token_type || "Bearer",
      expiresAt: getRobloxTokenExpiresAt(params.tokenResponse.expires_in),
    },
  })
}

export async function upsertRobloxConnectionFromToken(params: {
  userId: string
  tokenResponse: RobloxTokenResponse
}) {
  return persistRobloxConnectionFromToken(params)
}

export async function ensureRobloxAccessToken(userId: string) {
  const connection = await prisma.robloxConnection.findUnique({
    where: { userId },
  })

  if (!connection) {
    return null
  }

  if (connection.expiresAt.getTime() > Date.now() + 60 * 1000) {
    return {
      connection,
      accessToken: decryptRobloxOAuthSecret(connection.accessToken),
    }
  }

  const refreshedTokens = await refreshRobloxAccessToken(
    decryptRobloxOAuthSecret(connection.refreshToken)
  )
  const refreshedConnection = await persistRobloxConnectionFromToken({
    userId,
    tokenResponse: refreshedTokens,
  })

  return {
    connection: refreshedConnection,
    accessToken: refreshedTokens.access_token,
  }
}
