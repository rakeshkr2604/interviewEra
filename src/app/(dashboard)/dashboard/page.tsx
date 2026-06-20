import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PaymentSuccessBanner } from '@/components/dashboard/PaymentSuccessBanner'
import { createClient } from '@/lib/supabase/server'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { DashboardHeaderActions } from '@/components/dashboard/DashboardHeaderActions'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { DashboardMain } from './DashboardMain'
import { UserSummaryCard } from '@/components/dashboard/UserSummaryCard'
import { CreditsOverviewCard } from '@/components/dashboard/CreditsOverviewCard'
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid'
import { ProgressStatsGrid } from '@/components/dashboard/ProgressStatsGrid'
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import type { InterviewWithReportsRow } from './dashboard-types'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { formatDateEnIn } from '@/lib/datetime/ist'
import { buildRetentionDashboardSnapFromRow } from '@/lib/retention/build-retention-dashboard-snap'
import type { UserProgressRow } from '@/lib/retention/types'
import type { PlanTier } from '@/types/app.types'

export const metadata = PAGE_SEO.dashboard

/** Always read latest `user_progress` + `tier_config` for the placement card. */
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const interviewsSelect = `
        id,
        role,
        difficulty,
        status,
        completed_at,
        started_at,
        reports (
          overall_score,
          generated_at
        )
      `

  const [
    { data: userData, error: userError },
    { data: interviewsRaw },
    { data: progressSnap, error: progressErr },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('name, plan_tier, credits_remaining, plan_expires_at, plan_status, placement_date, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('interviews')
      .select(interviewsSelect)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5),
    supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  if (userError) {
    console.error('dashboard user fetch', userError.message)
  }

  const progressTableMissing = Boolean(
    progressErr &&
      (String(progressErr.code) === '42P01' ||
        (/user_progress/i.test(progressErr.message ?? '') &&
          /does not exist/i.test(progressErr.message ?? ''))),
  )

  const retentionDashboardSnap = progressTableMissing
    ? null
    : await buildRetentionDashboardSnapFromRow(
        (progressSnap as UserProgressRow | null) ?? null,
        user.id,
      )

  if (progressErr && !progressTableMissing) {
    console.error('dashboard user_progress fetch', progressErr.message)
  }

  const rows = (interviewsRaw ?? []) as InterviewWithReportsRow[]
  const completedCount = rows.filter((i) => i.status === 'completed').length
  const reports = rows.flatMap((i) =>
    i.status === 'completed'
      ? (i.reports ?? []).map((r) => ({
          overall_score: r.overall_score,
        }))
      : [],
  )
  const avgScore =
    reports.length > 0
      ? (reports.reduce((s, r) => s + (r.overall_score || 0), 0) / reports.length).toFixed(1)
      : null

  const memberSince = userData?.created_at ? formatDateEnIn(userData.created_at) : ''

  const creditsRemaining = userData?.credits_remaining ?? 0
  const displayName = userData?.name || user.email?.split('@')[0] || 'Student'
  const planTier = (userData?.plan_tier ?? 'free') as PlanTier
  const currentStreak = retentionDashboardSnap?.current_streak ?? 0

  return (
    <>
      <RetentionProgressRefreshListener />
      <Suspense fallback={null}>
        <PaymentSuccessBanner />
      </Suspense>
      <DashboardPageHeader
        eyebrow={
          <>
            <BrandWordmarkSplit className="text-[inherit]" /> analytics
          </>
        }
        title="Dashboard"
        subtitle="Track your interview performance and keep your prep on track."
        action={
          <DashboardHeaderActions
            creditsRemaining={creditsRemaining}
            planTier={userData?.plan_tier}
            planExpiresAt={userData?.plan_expires_at}
            planStatus={userData?.plan_status}
          />
        }
      />

      <UserSummaryCard
        userData={userData}
        displayName={displayName}
        memberSince={memberSince}
        completedCount={completedCount}
      />

      <CreditsOverviewCard
        creditsRemaining={creditsRemaining}
        completedCount={completedCount}
        planTier={planTier}
        planExpiresAt={userData?.plan_expires_at ?? null}
        planStatus={userData?.plan_status ?? null}
      />

      <QuickActionsGrid />

      <ProgressStatsGrid
        completedCount={completedCount}
        avgScore={avgScore}
        currentStreak={currentStreak}
        creditsRemaining={creditsRemaining}
        planTier={planTier}
        planExpiresAt={userData?.plan_expires_at ?? null}
        planStatus={userData?.plan_status ?? null}
      />

      <RetentionProgressCard snap={retentionDashboardSnap} />

      <DashboardMain rows={rows} userData={userData} />
    </>
  )
}
