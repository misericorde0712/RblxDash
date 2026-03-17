/**
 * Notifications Discord via webhooks HTTP natifs (gratuit).
 *
 * L'URL du webhook Discord est stockée par organisation dans Organization.discordWebhookUrl.
 * Elle est configurée depuis Settings > Notifications.
 */

async function sendDiscordMessage(webhookUrl: string, payload: object) {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[discord] Échec envoi (${res.status}):`, body)
    }
  } catch (err) {
    console.error("[discord] Erreur réseau:", err)
  }
}

// ─── Alertes ──────────────────────────────────────────────────────────────────

/**
 * Alerte quand une sanction de modération échoue à être livrée au serveur Roblox.
 */
export async function sendModerationFailedAlert({
  webhookUrl,
  gameName,
  sanctionType,
  robloxId,
  username,
  reason,
  error,
  appUrl,
}: {
  webhookUrl: string
  gameName: string
  sanctionType: string
  robloxId: string
  username?: string | null
  reason: string
  error?: string | null
  appUrl: string
}) {
  const playerLabel = username ? `**${username}** (${robloxId})` : `\`${robloxId}\``

  await sendDiscordMessage(webhookUrl, {
    embeds: [
      {
        title: "⚠️ Moderation delivery failed",
        color: 0xef4444, // rouge
        description: `A **${sanctionType.toLowerCase()}** could not be delivered in **${gameName}**.`,
        fields: [
          { name: "Player", value: playerLabel, inline: true },
          { name: "Reason", value: reason || "—", inline: true },
          ...(error ? [{ name: "Error", value: `\`${error}\``, inline: false }] : []),
        ],
        footer: { text: "RblxDash · Moderation" },
        timestamp: new Date().toISOString(),
        url: `${appUrl}/dashboard/moderation`,
      },
    ],
  })
}

/**
 * Alerte quand le webhook d'un jeu ne reçoit plus d'événements depuis trop longtemps.
 */
export async function sendWebhookDeadAlert({
  webhookUrl,
  gameName,
  lastEventAt,
  appUrl,
}: {
  webhookUrl: string
  gameName: string
  lastEventAt: Date | null
  appUrl: string
}) {
  const lastSeen = lastEventAt
    ? `Last event: <t:${Math.floor(lastEventAt.getTime() / 1000)}:R>`
    : "No event ever received."

  await sendDiscordMessage(webhookUrl, {
    embeds: [
      {
        title: "🔴 Webhook appears dead",
        color: 0xf59e0b, // amber
        description: `No events have been received for **${gameName}** in the last 30 minutes.`,
        fields: [
          { name: "Status", value: lastSeen, inline: false },
          {
            name: "What to check",
            value:
              "1. Roblox HTTP requests enabled\n2. DashbloxRuntime is in ServerScriptService\n3. Game is published and running",
            inline: false,
          },
        ],
        footer: { text: "RblxDash · Health" },
        timestamp: new Date().toISOString(),
        url: `${appUrl}/dashboard/health`,
      },
    ],
  })
}
