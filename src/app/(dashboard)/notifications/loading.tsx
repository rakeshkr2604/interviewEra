import { ListSkeleton, PageHeaderSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors the notifications feed: header, unread/mark-all row, then notification cards. */
export default function NotificationsLoading() {
  return (
    <div data-testid="notifications-skeleton">
      <PageHeaderSkeleton />
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <Pulse className="h-4 w-20 rounded-md" />
          <Pulse className="h-4 w-28 rounded-md" />
        </div>
        <ListSkeleton rows={5} rowClassName="min-h-[6.25rem]" />
      </div>
    </div>
  )
}
