import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PaymentSuccessBanner } from '@/components/dashboard/PaymentSuccessBanner'
import { dashboardPerfMark, dashboardPerfNow } from '@/lib/dashboard/perf-trace'
import { getCachedAuthUser } from '@/lib/dashboard/request-cache'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker'
import {
  DASHBOARD_PAGE_SUBTITLE,
  DASHBOARD_PAGE_TITLE,
  DashboardPageSkeleton,
} from '@/components/dashboard/DashboardPageSkeleton'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { DashboardHeaderActionsFromData, DashboardPageBody } from './DashboardPageBody'

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
      <div className="dashboard-page-shell min-w-0">
        <DashboardPageHeader
          eyebrow={
            <>
              <BrandWordmarkSplit className="text-[inherit]" /> analytics
            </>
          }
          title={DASHBOARD_PAGE_TITLE}
          subtitle={DASHBOARD_PAGE_SUBTITLE}
          action={
            <Suspense fallback={<div className="h-10 w-40" aria-hidden />}>
              <DashboardHeaderActionsFromData userId={user.id} />
            </Suspense>
          }
        />
        <Suspense fallback={<DashboardPageSkeleton includeHeader={false} />}>
          <DashboardPageBody user={user} />
        </Suspense>
      </div>
    </>
  )
}
