export function LocalAccountActions() {
  return (
    <div className="rounded-2xl border border-[#2a2a2a] bg-[#1d1d1d] p-5">
      <p className="rd-label text-[#e8822a]">Built-in auth</p>
      <p className="mt-3 text-lg font-semibold text-white">
        Local account management is enabled
      </p>
      <p className="mt-2 text-sm leading-6 text-[#9ca3af]">
        This self-hosted deployment does not use Clerk. Password resets, email
        verification, and profile editing are not exposed in the dashboard yet.
      </p>
      <p className="mt-4 text-sm leading-6 text-[#9ca3af]">
        Use the current email and password to sign in at <span className="text-white">/login</span>,
        and use the sidebar logout button to switch accounts.
      </p>
    </div>
  )
}
