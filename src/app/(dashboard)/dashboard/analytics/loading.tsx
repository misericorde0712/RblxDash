import { Skeleton } from "@/components/ui/skeleton"

export default function AnalyticsLoading() {
  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
        </div>
        {/* Range selector */}
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5"
          >
            <Skeleton className="h-3 w-24 rounded mb-3" />
            <Skeleton className="h-8 w-20 rounded mb-2" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Chart areas */}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5">
          <Skeleton className="h-5 w-32 rounded mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5">
          <Skeleton className="h-5 w-32 rounded mb-4" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
