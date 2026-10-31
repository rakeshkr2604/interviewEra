import { Pulse } from './skeletons'

export function DashboardPageSkeleton() {
  return (
    <div className="min-h-[80dvh] min-w-0" data-testid="dashboard-page-skeleton">
      <Pulse className="dashboard-section min-h-[6.5rem] sm:min-h-[7.5rem]" />
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
