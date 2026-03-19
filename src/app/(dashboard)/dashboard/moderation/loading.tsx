import { Skeleton } from "@/components/ui/skeleton"

export default function ModerationLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-64 rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {["Total (24h)", "Pending", "Failed"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#666666]">
              {label}
            </p>
            <Skeleton className="mt-2 h-9 w-12 rounded" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] overflow-hidden">
        <div className="border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-[#2a2a2a] px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
