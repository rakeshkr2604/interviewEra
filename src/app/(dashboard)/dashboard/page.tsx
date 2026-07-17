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
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { DashboardCommunityCard } from '@/components/community/DashboardCommunityCard'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import { CandidatePageTracker } from '@/components/candidate/CandidatePageTracker'
import { ReadinessOverviewCard } from '@/components/candidate/ReadinessOverviewCard'
import { RecommendationsStrip } from '@/components/candidate/RecommendationsStrip'
import { loadCandidateSnapshot } from '@/lib/candidate/load-snapshot'
import { isResumableInterviewStatus } from '@/lib/interview/interview-status'
import { computeReadinessScore } from '@/lib/candidate/readiness-score'
import { generatePersonalizedRoadmap } from '@/lib/candidate/roadmap'
import type { InterviewWithReportsRow } from './dashboard-types'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { formatDateEnIn } from '@/lib/datetime/ist'
import { resolveOAuthPictureUrl } from '@/lib/profile/user-display'
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
        engine,
        reports (
          id,
          overall_score,
          generated_at
        )
      `

  const [
    { data: userData, error: userError },
    { data: interviewsRaw },
    { data: progressSnap, error: progressErr },
    { count: completedCountTotal },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('name, plan_tier, credits_remaining, plan_expires_at, plan_status, placement_date, created_at, avatar_path')
      .eq('id', user.id)
      .single(),
    supabase
      .from('interviews')
      .select(interviewsSelect)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5),
    supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(),
    // Lifetime count, independent of the 5-row cap above — the "Completed" stat
    // tile must reflect all-time completions, not just the 5 most recent rows.
    supabase
      .from('interviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed'),
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

  const baseRows = (interviewsRaw ?? []) as InterviewWithReportsRow[]
  const recentIds = baseRows.map((r) => r.id)
  const { data: scriptReportsRaw } =
    recentIds.length > 0
      ? await supabase
          .from('script_interview_reports')
          .select('id, interview_id, overall, generated_at, status')
          .in('interview_id', recentIds)
      : { data: [] as { id: string; interview_id: string; overall: number | null; generated_at: string | null; status: string }[] }

  const scriptByInterview = new Map<string, InterviewWithReportsRow['script_interview_reports']>()
  for (const r of scriptReportsRaw ?? []) {
    const list = scriptByInterview.get(r.interview_id as string) ?? []
    list.push({
      id: r.id as string,
      overall: r.overall as number | null,
      generated_at: r.generated_at as string | null,
      status: r.status as string,
    })
    scriptByInterview.set(r.interview_id as string, list)
  }

  const rows: InterviewWithReportsRow[] = baseRows.map((row) => ({
    ...row,
    script_interview_reports: scriptByInterview.get(row.id) ?? [],
  }))
  const completedCount = completedCountTotal ?? 0
  const reports = rows.flatMap((i) => {
    if (i.status !== 'completed') return []
    if (i.engine === 'v2.1') {
      return (i.script_interview_reports ?? [])
        .filter((r) => (r.status === 'ready' || r.status === 'partial') && r.overall != null)
        .map((r) => ({ overall_score: Number(r.overall) }))
    }
    return (i.reports ?? []).map((r) => ({
      overall_score: r.overall_score,
    }))
  })
  const avgScore =
    reports.length > 0
      ? (reports.reduce((s, r) => s + (r.overall_score || 0), 0) / reports.length).toFixed(1)
      : null

  const memberSince = userData?.created_at ? formatDateEnIn(userData.created_at) : ''

  const creditsRemaining = userData?.credits_remaining ?? 0
  const displayName = userData?.name || user.email?.split('@')[0] || 'Student'
  const planTier = (userData?.plan_tier ?? 'free') as PlanTier
  const currentStreak = retentionDashboardSnap?.current_streak ?? 0

  const profileEmail = user.email ?? ''
  const avatarPath =
    userData && typeof userData.avatar_path === 'string' ? userData.avatar_path : null
  const oauthPictureUrl = resolveOAuthPictureUrl(user.user_metadata)

  // Only pending/in_progress are resumable server-side — abandoned is terminal.
  const inProgressInterview =
    rows.find((row) => isResumableInterviewStatus(row.status)) ?? null

  const candidateSnapshot = await loadCandidateSnapshot(user.id)
  const readiness = computeReadinessScore(candidateSnapshot)
  const roadmap = generatePersonalizedRoadmap(candidateSnapshot)

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
        title="Dashboard"
        subtitle="Your prep hub — practice, track progress, and improve."
        action={
          <DashboardHeaderActions
            creditsRemaining={creditsRemaining}
            planTier={userData?.plan_tier}
            planExpiresAt={userData?.plan_expires_at}
            planStatus={userData?.plan_status}
          />
        }
      />

      <div className="dashboard-section grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6 xl:gap-8">
        <UserSummaryCard
          userData={userData}
          displayName={displayName}
          memberSince={memberSince}
          completedCount={completedCount}
          avgScore={avgScore}
          currentStreak={currentStreak}
          email={profileEmail}
          avatarPath={avatarPath}
          oauthPictureUrl={oauthPictureUrl}
          inProgressInterview={
            inProgressInterview
              ? { id: inProgressInterview.id, role: inProgressInterview.role }
              : null
          }
        />

        <CreditsOverviewCard
          creditsRemaining={creditsRemaining}
          planTier={planTier}
          planExpiresAt={userData?.plan_expires_at ?? null}
          planStatus={userData?.plan_status ?? null}
          demotePracticeCta={Boolean(inProgressInterview)}
        />
      </div>

      <QuickActionsGrid resumeCompletionPct={candidateSnapshot.resumeCompletionPct} />

      <ReadinessOverviewCard readiness={readiness} />

      <RecommendationsStrip roadmap={roadmap} />

      <DashboardCommunityCard />

      <RetentionProgressCard snap={retentionDashboardSnap} />

      <div className="dashboard-section">
        <DashboardMain
          rows={rows}
          userData={userData}
          avgScore={avgScore}
          currentStreak={currentStreak}
        />
      </div>
      </div>
    </>
  )
}
