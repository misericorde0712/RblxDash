"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

function deriveSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export default function CreateOrganizationForm({
  redirectTo,
  submitLabel = "Create workspace",
}: {
  redirectTo: string
  submitLabel?: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Something went wrong")
        return
      }

      router.push(`${redirectTo}?created=${data.org.id}`)
      router.refresh()
    } catch {
      setError("Network error, please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="name"
          className="mb-1.5 block text-sm font-medium text-[#d1d5db]"
        >
          Workspace name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setSlug(deriveSlug(e.target.value))
          }}
          placeholder="My Studio"
          className="rd-input w-full text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="slug"
          className="mb-1.5 block text-sm font-medium text-[#d1d5db]"
        >
          URL slug
        </label>
        <div className="flex items-center rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2">
          <span className="select-none text-sm text-[#666666]">
            rblxdash.com/
          </span>
          <input
            id="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(deriveSlug(e.target.value))}
            placeholder="my-studio"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#666666] outline-none"
          />
        </div>
      </div>

      {error ? (
        <p className="rd-banner rd-banner-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rd-button-primary w-full disabled:opacity-50"
      >
        {loading ? "Creating..." : submitLabel}
      </button>
    </form>
  )
}
