/**
 * Shared skeleton primitives for dashboard route `loading.tsx` files.
 *
 * Each block mirrors the spacing of the real component it stands in for, so the
 * swap from skeleton to content does not shift layout (CLS).
 */

export function Pulse({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none rounded-xl ${className}`}
      style={{ background: 'var(--bg-tertiary)' }}
      aria-hidden
    />
  )
}

/** Mirrors `DashboardPageHeader` — eyebrow, title, subtitle, optional action. */
export function PageHeaderSkeleton({ withAction = false }: { withAction?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 lg:mb-8 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1">
        <Pulse className="h-3 w-24 rounded-md" />
        <Pulse className="mt-1.5 h-8 w-64 max-w-full sm:mt-2 sm:h-9 md:h-10" />
        <Pulse className="mt-2 h-4 w-full max-w-md sm:h-5" />
      </div>
      {withAction ? (
        <div className="flex w-full shrink-0 gap-2.5 sm:justify-end lg:w-auto">
          <Pulse className="h-11 w-32" />
          <Pulse className="h-11 w-44" />
        </div>
      ) : null}
    </div>
  )
}

/** Stack of equal-height cards — notifications feed, history rows, roadmap steps. */
export function ListSkeleton({
  rows = 5,
  rowClassName = 'min-h-[5.5rem]',
  className = 'space-y-3',
}: {
  rows?: number
  rowClassName?: string
  className?: string
}) {
  return (
    <div className={className}>
      {Array.from({ length: rows }, (_, i) => (
        <Pulse key={i} className={rowClassName} />
      ))}
    </div>
  )
}

/** Responsive card grid — category tiles, badge grids, pricing tiers. */
export function CardGridSkeleton({
  count = 3,
  columnsClassName = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  cardClassName = 'min-h-[10rem]',
  gapClassName = 'gap-3 sm:gap-4',
}: {
  count?: number
  columnsClassName?: string
  cardClassName?: string
  gapClassName?: string
}) {
  return (
    <div className={`grid ${columnsClassName} ${gapClassName}`}>
      {Array.from({ length: count }, (_, i) => (
        <Pulse key={i} className={cardClassName} />
      ))}
    </div>
  )
}
