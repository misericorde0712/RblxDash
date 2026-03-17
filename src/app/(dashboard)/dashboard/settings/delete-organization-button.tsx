"use client"

import { startTransition, useState } from "react"
import { useRouter } from "next/navigation"

export default function DeleteOrganizationButton({
  orgId,
  orgName,
}: {
  orgId: string
  orgName: string
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${orgName}? This will permanently remove this workspace's games, logs, invites, and team access.`
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/orgs/${orgId}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Unable to delete workspace")
        return
      }

      startTransition(() => {
        router.replace(data.redirectTo ?? "/dashboard/settings")
        router.refresh()
      })
    } catch {
      setError("Unable to delete workspace")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg border border-[rgba(248,113,113,0.22)] bg-[rgba(248,113,113,0.08)] px-3 py-2 text-sm font-medium text-[#fecaca] transition hover:bg-[rgba(248,113,113,0.12)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>

      {error ? <p className="text-xs text-[#fecaca]">{error}</p> : null}
    </div>
  )
}
