import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'

export const DASHBOARD_PAGE_TITLE = 'Dashboard'
export const DASHBOARD_PAGE_SUBTITLE =
  'Your prep hub — practice, track progress, and improve.'

function Pulse({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse motion-reduce:animate-none rounded-xl ${className}`}
      style={{ background: 'var(--bg-tertiary)' }}
      aria-hidden
    />
  )
}

export function DashboardPageSkeleton({
  includeHeader = true,
}: {
  includeHeader?: boolean
}) {
  return (
    <div
      className={includeHeader ? 'dashboard-page-shell min-h-[80dvh] min-w-0' : 'min-h-[70dvh] min-w-0'}
      data-testid="dashboard-page-skeleton"
    >
      {includeHeader ? (
        <DashboardPageHeader
          eyebrow={
            <>
              <BrandWordmarkSplit className="text-[inherit]" /> analytics
            </>
          }
          title={DASHBOARD_PAGE_TITLE}
          subtitle={DASHBOARD_PAGE_SUBTITLE}
          action={<div className="h-10 w-40" aria-hidden />}
        />
      ) : null}
      <div className="dashboard-section grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6 xl:gap-8">
        <Pulse className="min-h-[12rem] sm:min-h-[14rem]" />
        <Pulse className="min-h-[12rem] sm:min-h-[14rem]" />
      </div>
      <Pulse className="dashboard-section min-h-[6.5rem]" />
      <Pulse className="dashboard-section min-h-[8rem]" />
      <Pulse className="dashboard-section min-h-[7.5rem]" />
    </div>
  )
}
