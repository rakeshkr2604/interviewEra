import { redirect } from 'next/navigation'
import { DashboardMain } from './DashboardMain'
import { DashboardHeroGreeting } from '@/components/dashboard/DashboardHeroGreeting'
import { UserSummaryCard } from '@/components/dashboard/UserSummaryCard'
import { DashboardAccountLinksCard } from '@/components/dashboard/DashboardAccountLinksCard'
import { CreditsOverviewCard } from '@/components/dashboard/CreditsOverviewCard'
import { DashboardProgressOverview } from '@/components/dashboard/DashboardProgressOverview'
import { DashboardReadinessCard } from '@/components/dashboard/DashboardReadinessCard'
import { DashboardScoreTrendSection } from '@/components/dashboard/DashboardScoreTrendSection'
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid'
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { DashboardCommunityCard } from '@/components/community/DashboardCommunityCard'
import { ProfileCompletionCard } from '@/components/dashboard/ProfileCompletionCard'
import { ReadinessFocusAreas } from '@/components/candidate/ReadinessFocusAreas'
import { RecommendationsStrip } from '@/components/candidate/RecommendationsStrip'
import { computeReadinessScore } from '@/lib/candidate/readiness-score'
import { generatePersonalizedRoadmap } from '@/lib/candidate/roadmap'
import { loadDashboardPageData } from '@/lib/dashboard/load-dashboard-page-data'
import { buildDashboardFocusAreas } from '@/lib/dashboard/focus-areas'
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions'
import { formatDateEnIn } from '@/lib/datetime/ist'
import { resolveProfileOnboarding } from '@/lib/profile/onboarding-state'
import type { PlanTier } from '@/types/app.types'
import type { User } from '@supabase/supabase-js'

export async function DashboardPageBody({ user }: { user: User }) {
  const {
    userData,
    interviewsRaw,
    rows,
    progressInterviews,
    completedCount,
    recoveryTarget,
    retentionDashboardSnap,
    candidateSnapshot,
  } = await loadDashboardPageData(user.id)

  type ScoredReport = { overall_score: number; generated_at: string | null }

  // Build scored reports from progressInterviews (50 most recent completed) so the
  // trend chart and avg score reflect actual history, not just the activity-list rows.
  const reports: ScoredReport[] = progressInterviews.flatMap((i): ScoredReport[] => {
    if (i.engine === 'v2.1') {
      return (Array.isArray(i.script_interview_reports) ? i.script_interview_reports : [])
        .filter((r) => (r.status === 'ready' || r.status === 'partial') && r.overall != null)
        .map((r) => ({ overall_score: Number(r.overall), generated_at: r.generated_at ?? null }))
    }
    return (Array.isArray(i.reports) ? i.reports : [])
      .filter((r) => r.overall_score != null)
      .map((r) => ({ overall_score: Number(r.overall_score), generated_at: r.generated_at }))
  })
  const avgScore =
    reports.length > 0
      ? (reports.reduce((s, r) => s + (r.overall_score || 0), 0) / reports.length).toFixed(1)
      : null

  // Chronological (oldest → newest) for the trend chart's x-axis.
  const chronologicalReports = [...reports]
    .filter((r) => r.generated_at != null)
    .sort((a, b) => Date.parse(a.generated_at as string) - Date.parse(b.generated_at as string))

  const trendPoints = chronologicalReports.map((r, idx) => ({
    label: `#${idx + 1}`,
    score: r.overall_score,
  }))

  // Progress-overview window math: 50 most recent completed interviews, scored or not.
  // Use completed_at when set; fall back to started_at (legacy rows may lack completed_at).
  // Score is null when no report is ready yet — overview counts all completed sessions
  // but only averages scored ones. Uses a dedicated query (not the activity-list rows)
  // so that recently-started-but-not-completed interviews don't crowd out completed ones.
  const progressPoints = progressInterviews
    .flatMap((i) => {
      const completedAt = i.completed_at ?? i.started_at
      if (!completedAt) return []
      let score: number | null = null
      if (i.engine === 'v2.1') {
        const sirs = Array.isArray(i.script_interview_reports) ? i.script_interview_reports : []
        const rep = sirs.find((r) => (r.status === 'ready' || r.status === 'partial') && r.overall != null)
        score = rep?.overall != null ? Number(rep.overall) : null
      } else {
        const reps = Array.isArray(i.reports) ? i.reports : []
        const rep = reps.find((r) => r.overall_score != null)
        score = rep?.overall_score != null ? Number(rep.overall_score) : null
      }
      return [{ completedAt, score }]
    })
    .sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt))

  const memberSince = userData?.created_at ? formatDateEnIn(userData.created_at) : ''
  const creditsRemaining = userData?.credits_remaining ?? 0
  const displayName = userData?.name || user.email?.split('@')[0] || 'Student'
  const planTier = (userData?.plan_tier ?? 'free') as PlanTier
  const currentStreak = retentionDashboardSnap?.current_streak ?? 0

  const recoveryInterview = recoveryTarget
    ? {
        id: recoveryTarget.id,
        role: recoveryTarget.role,
        engine: recoveryTarget.engine,
        mode: recoveryTarget.mode,
      }
    : null

  const profileOnboarding = resolveProfileOnboarding({
    name: userData?.name,
    candidateProfile:
      userData && 'candidate_profile' in userData ? userData.candidate_profile : null,
    hasActiveResume: candidateSnapshot.hasActiveResume,
    hasInterviewHistory: (interviewsRaw ?? []).length > 0,
  })
  if (profileOnboarding.shouldRedirectToWelcome && planTier !== 'campus_admin') {
    redirect('/welcome')
  }

  const readiness = computeReadinessScore(candidateSnapshot)
  const roadmap = generatePersonalizedRoadmap(candidateSnapshot)
  const focusAreas = buildDashboardFocusAreas(candidateSnapshot.dimensionAverages, 5)
  const weakDimensionLabels = roadmap.weakDimensions.map((d) => REPORT_DIMENSION_LABELS[d])

  return (
    <>
      <DashboardHeroGreeting displayName={displayName} />

      <div className="dashboard-section grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6 xl:gap-8">
        <div className="flex h-full flex-col gap-3 sm:gap-4">
          <UserSummaryCard
            userData={userData}
            recoveryInterview={recoveryInterview}
            targetRole={roadmap.targetRole}
            weakDimensionLabels={weakDimensionLabels}
          />
          <DashboardAccountLinksCard memberSince={memberSince} />
        </div>

        <CreditsOverviewCard
          creditsRemaining={creditsRemaining}
          planTier={planTier}
          planExpiresAt={userData?.plan_expires_at ?? null}
          planStatus={userData?.plan_status ?? null}
          demotePracticeCta={Boolean(recoveryInterview)}
        />
      </div>

      <ProfileCompletionCard resolution={profileOnboarding} />

      <DashboardProgressOverview
        points={progressPoints}
        lifetimeCompletedCount={completedCount}
        currentStreak={currentStreak}
      />

      <div className="dashboard-section grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6 xl:gap-8">
        <DashboardReadinessCard readiness={readiness} />
        <DashboardScoreTrendSection points={trendPoints} avgScore={avgScore} />
      </div>

      <QuickActionsGrid />

      {profileOnboarding.state === 'complete' ? (
        <div className="dashboard-section grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6 xl:gap-8">
          <RecommendationsStrip roadmap={roadmap} />
          <ReadinessFocusAreas areas={focusAreas} />
        </div>
      ) : null}

      <DashboardCommunityCard />

      <div className="dashboard-section grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 lg:gap-6 xl:gap-8">
        <DashboardMain rows={rows} />
        <RetentionProgressCard snap={retentionDashboardSnap} />
      </div>
    </>
  )
}
