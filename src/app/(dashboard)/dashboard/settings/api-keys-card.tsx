"use client"

import { useState } from "react"
import Link from "next/link"

type ApiKey = {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
  createdBy: { name: string | null; email: string }
}

function formatDate(value: string | null) {
  if (!value) return "Never"
  return new Date(value).toLocaleDateString("en-CA", {
    year: "numeric", month: "short", day: "numeric",
  })
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded px-2 py-1 text-xs font-medium transition"
      style={{ background: "#2a2a2a", color: copied ? "#4ade80" : "#9ca3af" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  )
}

export default function ApiKeysCard({
  initialKeys,
  isStudio,
}: {
  initialKeys: ApiKey[]
  isStudio: boolean
}) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)

    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()

      if (!res.ok) {
        setCreateError(data.error?.message ?? "Something went wrong.")
        return
      }

      setCreatedKey(data.data.key)
      setKeys((prev) => [
        {
          id: data.data.id,
          name: data.data.name,
          keyPrefix: data.data.prefix,
          lastUsedAt: null,
          createdAt: data.data.createdAt,
          createdBy: { name: null, email: "" },
        },
        ...prev,
      ])
      setNewKeyName("")
    } catch {
      setCreateError("Network error, please try again.")
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(keyId: string) {
    if (!confirm("Revoke this API key? Any integration using it will stop working immediately.")) return
    setRevoking(keyId)

    try {
      const res = await fetch(`/api/v1/keys/${keyId}`, { method: "DELETE" })
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== keyId))
      }
    } finally {
      setRevoking(null)
    }
  }

  if (!isStudio) {
    return (
      <section className="rd-card p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-white">API Keys</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Programmatic access to your workspace data and moderation.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1d1d1d] p-5">
          <p className="text-sm text-[#9ca3af]">API access is available on the Studio plan.</p>
          <Link href="/account" className="rd-button-primary mt-4 inline-flex">
            Upgrade to Studio
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="rd-card p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-white">API Keys</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Use API keys to access your workspace programmatically. Keys are scoped to this workspace.{" "}
            <Link href="/dashboard/docs" className="text-[#e8822a] underline">
              View API docs →
            </Link>
          </p>
        </div>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rd-button-primary shrink-0"
          >
            Create key
          </button>
        )}
      </div>

      {/* Formulaire de création */}
      {showCreate && !createdKey && (
        <form onSubmit={handleCreate} className="mb-5 rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4">
          <p className="mb-3 text-sm font-semibold text-white">New API key</p>
          <div className="flex gap-3">
            <input
              type="text"
              required
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Discord moderation bot"
              className="rd-input flex-1 text-sm"
            />
            <button type="submit" disabled={creating} className="rd-button-primary disabled:opacity-50">
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setCreateError(null) }}
              className="rd-button-secondary"
            >
              Cancel
            </button>
          </div>
          {createError && <p className="mt-2 text-sm text-[#f87171]">{createError}</p>}
        </form>
      )}

      {/* Affichage unique de la clé créée */}
      {createdKey && (
        <div
          className="mb-5 rounded-xl p-4"
          style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}
        >
          <p className="mb-2 text-sm font-semibold text-white">
            Key created — copy it now, it won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#111] px-3 py-2">
            <code className="flex-1 break-all text-xs text-[#4ade80]">{createdKey}</code>
            <CopyButton value={createdKey} />
          </div>
          <p className="mt-2 text-xs text-[#9ca3af]">
            Store this key in your environment variables. It cannot be retrieved later.
          </p>
          <button
            onClick={() => { setCreatedKey(null); setShowCreate(false) }}
            className="rd-button-secondary mt-3"
          >
            Done
          </button>
        </div>
      )}

      {/* Liste des clés */}
      {keys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#1d1d1d] p-5">
          <p className="text-sm text-[#9ca3af]">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
            >
              <div>
                <p className="text-sm font-medium text-white">{key.name}</p>
                <p className="mt-0.5 font-mono text-xs text-[#666666]">{key.keyPrefix}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#666666]">
                <span>Created {formatDate(key.createdAt)}</span>
                <span>Last used: {formatDate(key.lastUsedAt)}</span>
                <button
                  onClick={() => handleRevoke(key.id)}
                  disabled={revoking === key.id}
                  className="rounded px-2 py-1 text-xs font-medium text-[#f87171] transition hover:bg-[rgba(248,113,113,0.1)] disabled:opacity-50"
                >
                  {revoking === key.id ? "Revoking..." : "Revoke"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
