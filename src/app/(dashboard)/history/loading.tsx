import { ListSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons'

/** Mirrors HistoryListClient: header then a `space-y-3` stack of interview rows. */
export default function HistoryLoading() {
  return (
    <div data-testid="history-skeleton">
      <PageHeaderSkeleton />
      <ListSkeleton rows={6} rowClassName="min-h-[6.5rem] sm:min-h-[5.5rem]" />
    </div>
  )
}
