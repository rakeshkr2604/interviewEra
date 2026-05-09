import Link from 'next/link'
import { PlacementCountdown } from '@/components/layout/PlacementCountdown'
import type { UserRow } from './dashboard-types'

export function DashboardWelcomeCard({
  userData,
  displayName,
  memberSince,
  creditsRemaining,
  completedCount,
}: {
  userData: UserRow | null
  displayName: string
  memberSince: string
  creditsRemaining: number
  completedCount: number
}) {
  return (
    <div className="dashboard-premium-card mb-6 flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-7">
      <div>
        <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Hi, {displayName}
        </p>
        <p className="text-sm mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
          Member since {memberSince} &nbsp;·&nbsp;
          Interviews completed: {completedCount} &nbsp;·&nbsp;
          Credits: {creditsRemaining} &nbsp;·&nbsp;
          1 interview = 1 credit
        </p>
      </div>
      <div className="flex items-center gap-3">
        {userData?.placement_date ? (
          <PlacementCountdown
            placementDate={userData.placement_date}
            interviewsCompleted={completedCount}
          />
        ) : null}
        <Link
          href="/feedback"
          className="rounded-[14px] border-2 px-4 py-2.5 text-sm font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          Give feedback
        </Link>
      </div>
    </div>
  )
}
