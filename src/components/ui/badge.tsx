type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent"

const VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-[#2a2a2a] border-[#3a3a3a] text-[#d1d5db]",
  success: "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.25)] text-[#4ade80]",
  warning: "bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.25)] text-[#fbbf24]",
  danger: "bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.25)] text-[#f87171]",
  accent: "bg-[rgba(232,130,42,0.1)] border-[rgba(232,130,42,0.25)] text-[#e8822a]",
}

type BadgeProps = {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  )
}
