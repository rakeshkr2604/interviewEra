import { PageHeaderSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors the analytics page: header, retention card, then score trend (2fr) + skill breakdown (1fr). */
export default function AnalyticsLoading() {
  return (
    <div data-testid="analytics-skeleton">
      <PageHeaderSkeleton />
      <div className="-mt-4 mb-6">
        <Pulse className="min-h-[9rem]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Pulse className="min-h-[22rem] lg:col-span-2" />
        <Pulse className="min-h-[22rem]" />
      </div>
    </div>
  )
}
