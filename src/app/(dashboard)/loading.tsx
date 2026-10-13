export default function DashboardGroupLoading() {
  return (
    <div className="dashboard-page-shell min-h-[80dvh] min-w-0" data-testid="dashboard-group-skeleton">
      <div
        className="mb-6 h-16 w-64 max-w-full animate-pulse motion-reduce:animate-none rounded-xl"
        style={{ background: 'var(--bg-tertiary)' }}
        aria-hidden
      />
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        <div
          className="min-h-[12rem] animate-pulse motion-reduce:animate-none rounded-xl"
          style={{ background: 'var(--bg-tertiary)' }}
          aria-hidden
        />
        <div
          className="min-h-[12rem] animate-pulse motion-reduce:animate-none rounded-xl"
          style={{ background: 'var(--bg-tertiary)' }}
          aria-hidden
        />
      </div>
    </div>
  )
}
