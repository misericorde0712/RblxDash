"use client"

import CreateOrganizationForm from "@/components/create-organization-form"

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-white">
          Create your workspace
        </h1>
        <p className="mb-8 text-sm text-gray-400">
          This is your workspace. You can invite team members after setup.
        </p>

        <CreateOrganizationForm redirectTo="/dashboard" />
      </div>
    </div>
  )
}
