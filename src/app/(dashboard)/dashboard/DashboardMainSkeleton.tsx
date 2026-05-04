/** Placeholder streamed while interviews + reports load (faster TTFB / earlier first paint). */
export function DashboardMainSkeleton() {
  return (
    <div aria-busy aria-label="Loading dashboard">
      <div className="dashboard-premium-card mb-6 flex flex-wrap items-stretch justify-between gap-4 px-6 py-5 sm:px-7">
        <div className="min-w-0 flex-1 space-y-2">
          <div
            className="h-5 w-48 max-w-full rounded-md animate-pulse"
            style={{ background: 'var(--bg-tertiary)' }}
          />
          <div
            className="h-4 w-full max-w-xl rounded-md animate-pulse"
            style={{ background: 'var(--bg-tertiary)' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-40 rounded-full animate-pulse max-sm:hidden"
            style={{ background: 'var(--bg-tertiary)' }}
          />
        </div>
      </div>

      <div className="dashboard-premium-card mb-6 px-6 py-5 sm:px-7">
        <div className="mb-4 flex justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-6 w-36 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-56 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
          <div className="h-14 w-20 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
        </div>
        <div
          className="mt-4 h-32 rounded-xl animate-pulse"
          style={{ background: 'var(--bg-secondary)' }}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(['a', 'b', 'c', 'd'] as const).map((k) => (
          <div key={k} className="dashboard-premium-card px-5 py-5 sm:px-6">
            <div className="h-3 w-24 rounded animate-pulse mb-4" style={{ background: 'var(--bg-tertiary)' }} />
            <div className="h-10 w-16 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          </div>
        ))}
      </div>

      <div className="mb-6 h-24 rounded-2xl animate-pulse" style={{ background: 'var(--card-bg)' }} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div
          className="dashboard-premium-card min-h-[240px] lg:col-span-2 px-6 py-5 sm:px-7"
        >
          <div className="mb-4 h-5 w-36 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
            ))}
          </div>
        </div>
        <div className="dashboard-premium-card min-h-[240px] px-5 py-5 sm:px-6">
          <div className="mb-4 h-5 w-28 rounded animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
          <div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
        </div>
      </div>
    </div>
  )
}
