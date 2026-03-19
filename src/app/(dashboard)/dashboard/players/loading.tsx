import { Skeleton } from "@/components/ui/skeleton"

export default function PlayersLoading() {
  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-64 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      </div>

      {/* Stats row */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5 mb-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {["Total tracked", "Live now", "Active in 24h", "Live servers"].map(
            (label) => (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[#666666]">
                  {label}
                </p>
                <Skeleton className="mt-2 h-9 w-16 rounded" />
              </div>
            )
          )}
        </div>
      </div>

      <Skeleton className="h-10 w-full rounded-lg mb-6" />

      {/* Table skeleton */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] overflow-hidden">
        <div className="border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-16 rounded" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-[#2a2a2a] px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-5 w-8 rounded" />
            <Skeleton className="h-5 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
