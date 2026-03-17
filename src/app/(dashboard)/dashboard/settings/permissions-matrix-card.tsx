const ROLE_COLUMNS = [
  { id: "MODERATOR", label: "Moderator" },
  { id: "ADMIN", label: "Admin" },
  { id: "OWNER", label: "Owner" },
] as const

type PermissionRow = {
  label: string
  roles: Record<(typeof ROLE_COLUMNS)[number]["id"], boolean>
  note?: string
}

const PERMISSION_ROWS: PermissionRow[] = [
  {
    label: "View dashboard and workspace data",
    roles: {
      MODERATOR: true,
      ADMIN: true,
      OWNER: true,
    },
  },
  {
    label: "Create games and rotate webhook secrets",
    roles: {
      MODERATOR: false,
      ADMIN: true,
      OWNER: true,
    },
  },
  {
    label: "Invite members with a shareable link",
    roles: {
      MODERATOR: false,
      ADMIN: true,
      OWNER: true,
    },
  },
  {
    label: "Change member roles and remove members",
    roles: {
      MODERATOR: false,
      ADMIN: true,
      OWNER: true,
    },
  },
  {
    label: "Promote another member to owner",
    roles: {
      MODERATOR: false,
      ADMIN: false,
      OWNER: true,
    },
  },
  {
    label: "Change billing plan",
    roles: {
      MODERATOR: false,
      ADMIN: true,
      OWNER: true,
    },
    note: "Only works for the billing owner account tied to Stripe.",
  },
] as const

function renderRoleValue(enabled: boolean) {
  return enabled ? "Yes" : "No"
}

export default function PermissionsMatrixCard() {
  return (
    <section className="rd-card p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-white">Permissions</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Workspace roles are cumulative. Higher roles keep the lower-role
          access.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm text-gray-300">
          <thead>
            <tr>
                <th className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]">
                  Action
                </th>
              {ROLE_COLUMNS.map((role) => (
                <th
                  key={role.id}
                  className="border-b border-[#2a2a2a] px-4 py-3 text-left text-xs font-medium uppercase tracking-[0.18em] text-[#666666]"
                >
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.label}>
                <td className="border-b border-[#2a2a2a] px-4 py-3 align-top text-white">
                  <div>{row.label}</div>
                  {row.note ? (
                    <div className="mt-1 text-xs text-[#666666]">{row.note}</div>
                  ) : null}
                </td>
                {ROLE_COLUMNS.map((role) => (
                  <td
                    key={role.id}
                    className="border-b border-[#2a2a2a] px-4 py-3 align-top text-[#d1d5db]"
                  >
                    {renderRoleValue(row.roles[role.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rd-card-muted mt-5 px-4 py-3 text-sm text-[#9ca3af]">
        Admins cannot create or promote another owner. The last owner of a
        workspace cannot be removed or demoted.
      </div>
    </section>
  )
}
