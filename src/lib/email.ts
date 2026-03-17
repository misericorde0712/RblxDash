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
            <td style="padding-top:24px;font-size:12px;color:#555555;text-align:center;">
              RblxDash · <a href="${appUrl}/account" style="color:#555555;">Manage account</a>
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
