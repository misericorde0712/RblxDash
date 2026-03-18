"use client"

import { useSearchParams } from "next/navigation"
import CreateOrganizationForm from "@/components/create-organization-form"

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const isTrial = searchParams.get("trial") === "1"

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ background: "#111" }}>
      <div className="w-full max-w-md rounded-2xl p-8" style={{ background: "#1e1e1e", border: "1px solid #333" }}>
        {isTrial && (
          <div
            className="mb-6 rounded-xl px-4 py-3 text-sm"
            style={{ border: "1px solid rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.06)", color: "#86efac" }}
          >
            Your free trial has started! Create a workspace to get going.
          </div>
        )}

        <h1 className="mb-2 text-2xl font-bold text-white">
          Create your workspace
        </h1>
        <p className="mb-8 text-sm" style={{ color: "#9ca3af" }}>
          This is your workspace. You can invite team members after setup.
        </p>

        <CreateOrganizationForm
          redirectTo={isTrial ? "/dashboard/games/new" : "/dashboard"}
        />
      </div>
    </div>
  )
}
