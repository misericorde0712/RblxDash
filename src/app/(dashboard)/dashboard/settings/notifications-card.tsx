"use client"

import { useState } from "react"

export default function NotificationsCard({
  currentDiscordWebhookUrl,
  canEdit,
}: {
  currentDiscordWebhookUrl: string | null
  canEdit: boolean
}) {
  const [url, setUrl] = useState(currentDiscordWebhookUrl ?? "")
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [testError, setTestError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setStatus("saving")
    setErrorMsg(null)

    try {
      const res = await fetch("/api/orgs/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordWebhookUrl: url || null }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? "Something went wrong")
        setStatus("error")
        return
      }

      setStatus("saved")
      setTimeout(() => setStatus("idle"), 3000)
    } catch {
      setErrorMsg("Network error, please try again")
      setStatus("error")
    }
  }

  return (
    <section className="rd-card p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">Notifications</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Get alerted on Discord when moderation fails to deliver or your webhook goes silent.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="discord-webhook" className="mb-1.5 block text-sm font-medium text-[#d1d5db]">
            Discord webhook URL
          </label>
          <input
            id="discord-webhook"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canEdit}
            placeholder="https://discord.com/api/webhooks/..."
            className="rd-input w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="mt-1.5 text-xs text-[#666666]">
            In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy URL.
          </p>
        </div>

        {status === "error" && errorMsg ? (
          <p className="rd-banner rd-banner-danger">{errorMsg}</p>
        ) : null}

        {status === "saved" ? (
          <p className="rd-banner rd-banner-success">Saved successfully.</p>
        ) : null}

        {canEdit ? (
          <button
            type="submit"
            disabled={status === "saving"}
            className="rd-button-primary disabled:opacity-50"
          >
            {status === "saving" ? "Saving..." : "Save"}
          </button>
        ) : (
          <p className="text-xs text-[#666666]">Only owners and admins can change notification settings.</p>
        )}
      </form>

      {currentDiscordWebhookUrl && (
        <div className="mt-5 space-y-3">
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.15)",
              color: "#86efac",
            }}
          >
            Discord alerts active — moderation failures and dead webhooks will be sent to your channel.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={testStatus === "sending"}
              onClick={async () => {
                setTestStatus("sending")
                setTestError(null)
                try {
                  const res = await fetch("/api/orgs/notifications/test", { method: "POST" })
                  if (res.ok) {
                    setTestStatus("sent")
                    setTimeout(() => setTestStatus("idle"), 5000)
                  } else {
                    const data = await res.json().catch(() => ({ error: "Unknown error" }))
                    setTestError(data.error ?? "Test failed")
                    setTestStatus("error")
                    setTimeout(() => setTestStatus("idle"), 5000)
                  }
                } catch {
                  setTestError("Network error")
                  setTestStatus("error")
                  setTimeout(() => setTestStatus("idle"), 5000)
                }
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50"
              style={{ border: "1px solid #2a2a2a", color: "#9ca3af" }}
            >
              {testStatus === "sending" ? "Sending..." : "Send test notification"}
            </button>

            {testStatus === "sent" && (
              <span className="text-xs" style={{ color: "#86efac" }}>Sent! Check your Discord channel.</span>
            )}
            {testStatus === "error" && testError && (
              <span className="text-xs" style={{ color: "#fca5a5" }}>{testError}</span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
