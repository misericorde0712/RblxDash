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
        <div
          className="mt-5 rounded-xl px-4 py-3 text-sm"
          style={{
            background: "rgba(74,222,128,0.06)",
            border: "1px solid rgba(74,222,128,0.15)",
            color: "#86efac",
          }}
        >
          Discord alerts active — moderation failures and dead webhooks will be sent to your channel.
        </div>
      )}
    </section>
  )
}
