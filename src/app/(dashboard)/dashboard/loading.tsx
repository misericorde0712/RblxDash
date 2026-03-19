import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="mt-2 h-4 w-72 rounded-lg" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5"
          >
            <Skeleton className="h-3 w-20 rounded mb-3" />
            <Skeleton className="h-8 w-16 rounded mb-2" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] p-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg mb-3 last:mb-0" />
        ))}
      </div>
    </div>
  )
}
