/** Full-page skeleton if dashboard is ever wrapped in Suspense again — matches compact dashboard layout. */
export function DashboardMainSkeleton() {
  return (
    <div aria-busy aria-label="Loading dashboard">
      <div className="dashboard-premium-card mb-4 px-4 py-4 sm:mb-5 sm:px-6 sm:py-5">
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
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
          <div className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        </div>
      </div>

      <div className="dashboard-premium-card mb-4 px-4 py-4 sm:mb-5 sm:px-6 sm:py-5">
        <div className="mb-4 h-5 w-36 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
        <div className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        <div className="mt-4 h-11 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dashboard-premium-card h-24 animate-pulse" style={{ background: 'var(--card-bg)' }} />
        ))}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2.5 sm:mb-6 lg:grid-cols-4">
        {(['a', 'b', 'c', 'd'] as const).map((k) => (
          <div key={k} className="dashboard-premium-card h-24 animate-pulse" style={{ background: 'var(--card-bg)' }} />
        ))}
      </div>

      <div className="dashboard-premium-card mb-6 px-6 py-5 sm:px-7">
        <div className="mb-4 flex justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-6 w-36 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        </div>
        <div className="mt-4 h-32 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
      </div>
    </div>
  )
}
