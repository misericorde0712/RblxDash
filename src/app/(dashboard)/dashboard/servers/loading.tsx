import { Skeleton } from "@/components/ui/skeleton"

export default function ServersLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Skeleton className="h-7 w-36 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] overflow-hidden">
        <div className="border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex gap-8">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8 border-b border-[#2a2a2a] px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
