import {
  CardGridSkeleton,
  PageHeaderSkeleton,
  Pulse,
} from '@/components/dashboard/skeletons'

/** Mirrors ReadinessPageContent: header + controls, score hero, 5 category tiles, trend + focus. */
export default function ReadinessLoading() {
  return (
    <div className="space-y-6" data-testid="readiness-skeleton">
      <PageHeaderSkeleton withAction />
      <Pulse className="min-h-[11rem] sm:min-h-[9.5rem]" />
      <CardGridSkeleton
        count={5}
        columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
        cardClassName="min-h-[8.5rem]"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Pulse className="min-h-[18rem] lg:col-span-2" />
        <Pulse className="min-h-[18rem]" />
      </div>
    </div>
  )
}
