import { CardGridSkeleton, PageHeaderSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors /prepare: header, speaking PDF shelf, then the prep toolkit grid. */
export default function PrepareLoading() {
  return (
    <div className="space-y-6" data-testid="prepare-skeleton">
      <PageHeaderSkeleton />
      <Pulse className="min-h-[12rem]" />
      <CardGridSkeleton count={6} cardClassName="min-h-[9rem]" />
    </div>
  )
}
