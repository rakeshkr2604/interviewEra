import { ListSkeleton, PageHeaderSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors RoadmapPageContent: header, focus hero, then the four roadmap sections. */
export default function RoadmapLoading() {
  return (
    <div className="space-y-6" data-testid="roadmap-skeleton">
      <PageHeaderSkeleton />
      <Pulse className="min-h-[7.5rem]" />
      <ListSkeleton rows={4} rowClassName="min-h-[11rem]" className="space-y-6" />
    </div>
  )
}
