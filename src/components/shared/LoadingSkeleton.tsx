interface SkeletonProps {
  className?: string
  count?: number
}

export function Skeleton({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-lg bg-(--bg-tertiary) ${className}`}
        />
      ))}
    </>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid grid-cols-4 gap-4">
        <Skeleton className="h-28" count={4} />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function InterviewCardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-(--card-border)
                    bg-(--card-bg) p-5">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}
