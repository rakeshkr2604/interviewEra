/** Full-page skeleton if dashboard is ever wrapped in Suspense again — matches compact dashboard layout. */
export function DashboardMainSkeleton() {
  return (
    <div aria-busy aria-label="Loading dashboard">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:mb-5 sm:gap-5 lg:mb-8 lg:grid-cols-2 lg:items-stretch lg:gap-6 xl:gap-8">
        <div className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex gap-3">
            <div
              className="size-12 shrink-0 rounded-full animate-pulse"
              style={{ background: 'var(--bg-tertiary)' }}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-5 w-40 max-w-full rounded-md animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
              <div className="h-4 w-28 rounded-md animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            </div>
          </div>
        </div>

        <div className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="mb-4 h-5 w-24 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          <div className="mt-4 h-11 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-5 lg:grid-cols-4 lg:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dashboard-premium-card h-24 animate-pulse" style={{ background: 'var(--card-bg)' }} />
        ))}
      </div>

      <div className="mb-4 h-28 animate-pulse rounded-3xl" style={{ background: 'var(--card-bg)' }} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="dashboard-premium-card h-64 animate-pulse lg:col-span-2" style={{ background: 'var(--card-bg)' }} />
        <div className="dashboard-premium-card h-64 animate-pulse" style={{ background: 'var(--card-bg)' }} />
      </div>
    </div>
  )
}
