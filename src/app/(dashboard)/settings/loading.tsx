import { PageHeaderSkeleton, Pulse } from '@/components/dashboard/skeletons'

/** Mirrors SettingsPageClient: header then the two-column settings card grid. */
export default function SettingsLoading() {
  return (
    <div
      className="flex w-full max-w-none flex-col pb-10 lg:flex-row lg:items-start lg:gap-8 lg:pb-12"
      data-testid="settings-skeleton"
    >
      <div className="min-w-0 flex-1 space-y-6 md:space-y-7">
        <PageHeaderSkeleton />
        <div className="grid gap-6 md:gap-y-5 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Pulse key={i} className="min-h-[13rem]" />
          ))}
        </div>
      </div>
    </div>
  )
}
