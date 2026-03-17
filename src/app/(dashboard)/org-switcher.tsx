"use client"

import { startTransition, useState } from "react"
import type { ChangeEvent } from "react"
import { usePathname, useRouter } from "next/navigation"
import type { OrgRole, Plan } from "@prisma/client"
import { formatOrgRole } from "@/lib/org-members"

type OrgOption = {
  id: string
  name: string
  slug: string
  role: OrgRole
  billingPlan: Plan | null
}

function getRedirectPath(pathname: string) {
  if (!pathname.startsWith("/dashboard")) {
    return "/dashboard"
  }

  if (pathname.startsWith("/dashboard/games/") && pathname !== "/dashboard/games/new") {
    return "/dashboard/games"
  }

  return pathname
}

export default function OrgSwitcher({
  organizations,
  currentOrgId,
}: {
  organizations: OrgOption[]
  currentOrgId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedOrgId, setSelectedOrgId] = useState(currentOrgId)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentOrg =
    organizations.find((organization) => organization.id === selectedOrgId) ??
    organizations[0]

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextOrgId = event.target.value
    const previousOrgId = selectedOrgId
    const redirectTo = getRedirectPath(pathname)

    setSelectedOrgId(nextOrgId)
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch("/api/orgs/current", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orgId: nextOrgId,
          redirectTo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setSelectedOrgId(previousOrgId)
        setError(data.error ?? "Unable to switch organization")
        return
      }

      startTransition(() => {
        router.replace(data.redirectTo ?? redirectTo)
        router.refresh()
      })
    } catch {
      setSelectedOrgId(previousOrgId)
      setError("Unable to switch organization")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <label
        htmlFor="current-org"
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500"
      >
        Organization
      </label>
      <select
        id="current-org"
        value={selectedOrgId}
        onChange={handleChange}
        disabled={isSaving || organizations.length <= 1}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {organizations.map((organization) => (
          <option key={organization.id} value={organization.id}>
            {organization.name}
          </option>
        ))}
      </select>

      {currentOrg ? (
        <p className="mt-2 text-xs text-gray-500">
          {currentOrg.slug} / {formatOrgRole(currentOrg.role)}
          {currentOrg.billingPlan ? ` / ${currentOrg.billingPlan}` : ""}
        </p>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
