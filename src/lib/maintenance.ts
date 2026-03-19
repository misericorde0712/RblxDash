import { NextResponse } from "next/server"

/**
 * Mode maintenance.
 * Activé via la variable d'environnement MAINTENANCE_MODE=true.
 * Optionnel : MAINTENANCE_MESSAGE pour personnaliser le message.
 * Optionnel : MAINTENANCE_ALLOWED_IPS (comma-separated) pour bypass.
 */

export function isMaintenanceMode(): boolean {
  return (process.env.MAINTENANCE_MODE ?? "") === "true"
}

export function isIpAllowed(ip: string | null): boolean {
  const allowedIps = process.env.MAINTENANCE_ALLOWED_IPS ?? ""
  if (!allowedIps) return false
  if (!ip) return false
  return allowedIps.split(",").map((s) => s.trim()).includes(ip)
}

export function getMaintenanceResponse(): NextResponse {
  const message =
    process.env.MAINTENANCE_MESSAGE ??
    "RblxDash is currently undergoing scheduled maintenance. We'll be back shortly."

  return new NextResponse(
    JSON.stringify({
      error: {
        code: "MAINTENANCE",
        message,
      },
    }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": "300",
      },
    }
  )
}

export function getMaintenancePageHtml(): string {
  const message =
    process.env.MAINTENANCE_MESSAGE ??
    "RblxDash is currently undergoing scheduled maintenance. We'll be back shortly."

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Maintenance — RblxDash</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a1a;
      color: #fff;
      font-family: 'General Sans', system-ui, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #222;
      border: 1px solid #2a2a2a;
      border-radius: 24px;
      padding: 48px;
      max-width: 480px;
      text-align: center;
    }
    .label {
      color: #e8822a;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    h1 {
      margin-top: 16px;
      font-size: 28px;
      font-weight: 600;
    }
    p {
      margin-top: 12px;
      color: #9ca3af;
      font-size: 15px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="label">Maintenance</p>
    <h1>We'll be right back</h1>
    <p>${message}</p>
  </div>
</body>
</html>`
}
