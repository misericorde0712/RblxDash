import { Skeleton } from "@/components/ui/skeleton"

export default function LogsLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Skeleton className="h-7 w-24 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="ml-auto h-9 w-64 rounded-lg" />
      </div>

      {/* Event distribution */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5 mb-6">
        <Skeleton className="h-4 w-40 rounded mb-4" />
        <div className="flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 rounded-full w-20" />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] overflow-hidden">
        <div className="border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-[#2a2a2a] px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
