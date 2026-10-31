import { CardGridSkeleton, PageHeaderSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors /upgrade: header, plan summary strip, pricing tiers, community CTA. */
export default function UpgradeLoading() {
  return (
    <div className="space-y-8" data-testid="upgrade-skeleton">
      <PageHeaderSkeleton />
      <Pulse className="min-h-[7rem]" />
      <CardGridSkeleton count={3} cardClassName="min-h-[26rem]" gapClassName="gap-4" />
      <Pulse className="min-h-[9rem]" />
    </div>
  )
}
