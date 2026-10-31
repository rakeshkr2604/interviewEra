import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PaymentSuccessBanner } from '@/components/dashboard/PaymentSuccessBanner'
import { dashboardPerfMark, dashboardPerfNow } from '@/lib/dashboard/perf-trace'
import { getCachedAuthUser } from '@/lib/dashboard/request-cache'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker'
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { DashboardPageBody } from './DashboardPageBody'

export const metadata = PAGE_SEO.dashboard

/** Always read latest `user_progress` + `tier_config` for the placement card. */
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const shellStarted = dashboardPerfNow()
  const user = await getCachedAuthUser()
  if (!user) redirect('/login')
  dashboardPerfMark('page.shell', shellStarted, { cached: true })

  return (
    <>
      <CandidatePageTracker event="dashboard_viewed" />
      <RetentionProgressRefreshListener />
      <Suspense fallback={null}>
        <PaymentSuccessBanner />
      </Suspense>
      {/* Hero greeting card inside DashboardPageBody is the page header now —
          a separate eyebrow/title/subtitle band above it read as duplicated. */}
      <div className="dashboard-page-shell min-w-0">
        <Suspense fallback={<DashboardPageSkeleton />}>
          <DashboardPageBody user={user} />
        </Suspense>
      </div>
    </>
  )
}
