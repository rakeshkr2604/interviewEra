import { CardGridSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors /profile/badges: max-w-4xl column with its own header, tier ladder, XP chart, badge grid. */
export default function BadgesLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl" data-testid="badges-skeleton">
      <header className="mb-8">
        <Pulse className="h-3 w-16 rounded-md" />
        <Pulse className="mt-2 h-8 w-56 max-w-full sm:h-9" />
        <Pulse className="mt-2 h-4 w-80 max-w-full" />
      </header>
      <Pulse className="mb-8 min-h-[8rem]" />
      <Pulse className="mb-8 min-h-[14rem]" />
      <CardGridSkeleton
        count={8}
        columnsClassName="grid-cols-2 sm:grid-cols-4"
        cardClassName="min-h-[6.5rem]"
        gapClassName="gap-3"
      />
    </div>
  )
}
