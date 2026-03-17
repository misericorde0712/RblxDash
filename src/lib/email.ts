/**
 * Email sending via Resend HTTP API (https://resend.com)
 * Free tier: 3 000 emails/mois, 100/jour — aucun package npm requis.
 *
 * Variables d'environnement requises:
 *   RESEND_API_KEY   — clé API Resend
 *   NEXT_PUBLIC_APP_URL — URL publique de l'app (ex: https://rblxdash.com)
 */

const RESEND_API = "https://api.resend.com/emails"
const FROM = "RblxDash <noreply@rblxdash.com>"

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY non configuré — email ignoré")
    return
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error(`[email] Échec envoi (${res.status}):`, body)
    }
  } catch (err) {
    console.error("[email] Erreur réseau:", err)
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

function baseLayout(content: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>RblxDash</title>
</head>
<body style="margin:0;padding:0;background:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <a href="${appUrl}" style="text-decoration:none;">
                <span style="font-size:20px;font-weight:700;color:#e8822a;">RblxDash</span>
              </a>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#1e1e1e;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;font-size:12px;color:#555555;text-align:center;line-height:1.8;">
              RblxDash · <a href="${appUrl}/account" style="color:#555555;">Manage account</a>
              &nbsp;·&nbsp;
              <a href="${appUrl}/account" style="color:#555555;">Unsubscribe</a>
              <br/>
              RblxDash, dashblox.desgagneweb.com — You are receiving this because you have an active account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function btn(label: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#e8822a;color:#ffffff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:24px;">${label}</a>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#ffffff;">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:8px 0;font-size:15px;line-height:1.6;color:#9ca3af;">${text}</p>`
}

// ─── Emails ───────────────────────────────────────────────────────────────────

/**
 * Envoyé quand l'utilisateur crée son premier workspace.
 */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1(`Welcome to RblxDash, ${name || "developer"} 👋`)}
    ${p("Your workspace is ready. The next step is to connect your first Roblox game.")}
    ${p("It only takes a few minutes: add your game, paste the Luau script into ServerScriptService, and enable HTTP requests. That's it.")}
    ${btn("Connect my first game", `${appUrl}/dashboard/games/new`)}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;" />
    ${p("Need help? Open the <a href='${appUrl}/dashboard/guide' style='color:#e8822a;'>Setup Guide</a> inside the dashboard — it walks you through every step.")}
  `)

  await sendEmail({
    to,
    subject: "Welcome to RblxDash — connect your first game",
    html,
  })
}

/**
 * Envoyé 3 jours avant la fin du trial (via l'événement Stripe trial_will_end).
 */
export async function sendTrialExpiryEmail({
  to,
  name,
  trialEndsAt,
}: {
  to: string
  name: string
  trialEndsAt: Date
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const dateStr = trialEndsAt.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const html = baseLayout(`
    ${h1("Your trial ends soon")}
    ${p(`Hi ${name || "there"}, your RblxDash Pro trial expires on <strong style="color:#ffffff;">${dateStr}</strong>.`)}
    ${p("After that date, your account will revert to the Free plan (1 game, 7-day log retention). Your existing data stays safe.")}
    ${p("To keep Pro features — 5 games, 30-day logs, full moderation suite, and analytics — add a payment method before your trial ends.")}
    ${btn("Manage billing", `${appUrl}/account`)}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;" />
    ${p("Questions? Reply to this email or check the dashboard.")}
  `)

  await sendEmail({
    to,
    subject: `Your RblxDash trial expires on ${dateStr}`,
    html,
  })
}

/**
 * Envoyé 3 jours après l'inscription si l'utilisateur n'a pas encore connecté de jeu.
 */
export async function sendNoGameConnectedEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1("Your dashboard is still empty")}
    ${p(`Hi ${name || "there"} — you signed up for RblxDash but haven't connected a game yet.`)}
    ${p("Connecting takes about 5 minutes:")}
    <ol style="color:#9ca3af;font-size:15px;line-height:2;padding-left:20px;margin:12px 0;">
      <li>Add your game (Place ID)</li>
      <li>Paste the Luau script into ServerScriptService</li>
      <li>Enable HTTP Requests in game settings</li>
      <li>Publish and join once — you're live</li>
    </ol>
    ${p("Once connected, your dashboard shows live servers, player sessions, and moderation in real time.")}
    ${btn("Connect my game now", `${appUrl}/dashboard/games/new`)}
  `)

  await sendEmail({
    to,
    subject: "Your RblxDash dashboard is waiting for your first game",
    html,
  })
}

/**
 * Envoyé quand le premier événement webhook arrive pour un jeu.
 */
export async function sendGameConnectedEmail({
  to,
  name,
  gameName,
}: {
  to: string
  name: string
  gameName: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1("Your game is live! 🎮")}
    ${p(`Great news, ${name || "developer"} — <strong style="color:#ffffff;">${gameName}</strong> just sent its first event to RblxDash.`)}
    ${p("Your dashboard is now tracking:")}
    <ul style="color:#9ca3af;font-size:15px;line-height:2;padding-left:20px;margin:12px 0;">
      <li>Live servers and player count</li>
      <li>Player joins, leaves, and sessions</li>
      <li>Event timeline and health status</li>
    </ul>
    ${p("Next up: explore moderation tools, set up Discord alerts, or invite your team.")}
    ${btn("Open my dashboard", `${appUrl}/dashboard`)}
  `)

  await sendEmail({
    to,
    subject: `${gameName} is now connected to RblxDash`,
    html,
  })
}

/**
 * Envoyé 7 jours après le début du trial — résumé de la première semaine.
 */
export async function sendWeeklyAnalyticsEmail({
  to,
  name,
  stats,
}: {
  to: string
  name: string
  stats: {
    totalEvents: number
    uniquePlayers: number
    totalSanctions: number
    gamesCount: number
  }
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1("Your first week on RblxDash 📊")}
    ${p(`Hi ${name || "there"}, here's what happened in your first 7 days:`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#e8822a;">${stats.totalEvents.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Events tracked</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#4ade80;">${stats.uniquePlayers.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Unique players</p>
        </td>
      </tr>
      <tr><td colspan="3" style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#f87171;">${stats.totalSanctions}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Sanctions issued</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#7dd3fc;">${stats.gamesCount}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Games connected</p>
        </td>
      </tr>
    </table>
    ${p("Keep it going — your analytics get more valuable every day.")}
    ${btn("View full analytics", `${appUrl}/dashboard/analytics`)}
  `)

  await sendEmail({
    to,
    subject: "Your first week on RblxDash — here are the numbers",
    html,
  })
}

/**
 * Envoyé chaque semaine aux utilisateurs actifs — résumé hebdomadaire.
 */
export async function sendWeeklySummaryEmail({
  to,
  name,
  stats,
  period,
}: {
  to: string
  name: string
  stats: {
    totalEvents: number
    uniquePlayers: number
    newSanctions: number
    peakOnline: number
  }
  period: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1("Weekly summary")}
    ${p(`Hi ${name || "there"}, here's your week in review (${period}):`)}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#e8822a;">${stats.totalEvents.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Events</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#4ade80;">${stats.uniquePlayers.toLocaleString()}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Unique players</p>
        </td>
      </tr>
      <tr><td colspan="3" style="height:8px;"></td></tr>
      <tr>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#f87171;">${stats.newSanctions}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">New sanctions</p>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:12px;background:#111111;border-radius:8px;text-align:center;width:50%;">
          <p style="margin:0;font-size:24px;font-weight:700;color:#7dd3fc;">${stats.peakOnline}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Peak online</p>
        </td>
      </tr>
    </table>
    ${btn("Open dashboard", `${appUrl}/dashboard`)}
  `)

  await sendEmail({
    to,
    subject: `RblxDash weekly — ${period}`,
    html,
  })
}

/**
 * Envoyé quand un utilisateur est inactif depuis 7 jours.
 */
export async function sendInactiveUserEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1("We miss you 👋")}
    ${p(`Hi ${name || "there"}, it's been a week since your last visit to RblxDash.`)}
    ${p("Your games are still sending data, and your dashboard has been keeping track of everything while you were away.")}
    ${p("Here's what you might have missed:")}
    <ul style="color:#9ca3af;font-size:15px;line-height:2;padding-left:20px;margin:12px 0;">
      <li>New player sessions and events</li>
      <li>Moderation actions that may need review</li>
      <li>Updated analytics and trends</li>
    </ul>
    ${btn("Check my dashboard", `${appUrl}/dashboard`)}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;" />
    ${p("If you no longer want these emails, update your notification preferences in your <a href='${appUrl}/account' style='color:#e8822a;'>account settings</a>.")}
  `)

  await sendEmail({
    to,
    subject: "Your RblxDash dashboard has been waiting for you",
    html,
  })
}

/**
 * Envoyé quand un paiement échoue (invoice.payment_failed).
 */
export async function sendPaymentFailedEmail({
  to,
  name,
  amountDue,
  currency,
  nextAttemptAt,
}: {
  to: string
  name: string
  amountDue: number
  currency: string
  nextAttemptAt: Date | null
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const amount = (amountDue / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  })
  const retryStr = nextAttemptAt
    ? nextAttemptAt.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : null

  const html = baseLayout(`
    ${h1("Payment failed")}
    ${p(`Hi ${name || "there"}, we were unable to process your payment of <strong style="color:#ffffff;">${amount}</strong> for your RblxDash subscription.`)}
    ${retryStr ? p(`Stripe will automatically retry on <strong style="color:#ffffff;">${retryStr}</strong>.`) : ""}
    ${p("To avoid any interruption to your service, please update your payment method now.")}
    ${btn("Update payment method", `${appUrl}/account`)}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0;" />
    ${p("If you believe this is an error or need help, reply to this email and we'll sort it out.")}
  `)

  await sendEmail({
    to,
    subject: `Action required: payment of ${amount} failed`,
    html,
  })
}

/**
 * Envoyé quand un utilisateur atteint un milestone (célébration).
 */
export async function sendCelebrationEmail({
  to,
  name,
  milestone,
  detail,
}: {
  to: string
  name: string
  milestone: string
  detail: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://rblxdash.com"
  const html = baseLayout(`
    ${h1(`${milestone} 🎉`)}
    ${p(`Congratulations, ${name || "developer"}!`)}
    ${p(detail)}
    ${p("Keep going — your next milestone is right around the corner.")}
    ${btn("View my dashboard", `${appUrl}/dashboard`)}
  `)

  await sendEmail({
    to,
    subject: `RblxDash — ${milestone}`,
    html,
  })
}
