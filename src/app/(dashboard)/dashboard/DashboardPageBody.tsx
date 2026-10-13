import { redirect } from 'next/navigation'
import { DashboardMain } from './DashboardMain'
import { DashboardHeaderActions } from '@/components/dashboard/DashboardHeaderActions'
import { UserSummaryCard } from '@/components/dashboard/UserSummaryCard'
import { CreditsOverviewCard } from '@/components/dashboard/CreditsOverviewCard'
import { QuickActionsGrid } from '@/components/dashboard/QuickActionsGrid'
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { DashboardCommunityCard } from '@/components/community/DashboardCommunityCard'
import { ProfileCompletionCard } from '@/components/dashboard/ProfileCompletionCard'
import { ReadinessOverviewCard } from '@/components/candidate/ReadinessOverviewCard'
import { RecommendationsStrip } from '@/components/candidate/RecommendationsStrip'
import { computeReadinessScore } from '@/lib/candidate/readiness-score'
import { generatePersonalizedRoadmap } from '@/lib/candidate/roadmap'
import { loadDashboardPageData } from '@/lib/dashboard/load-dashboard-page-data'
import { formatDateEnIn } from '@/lib/datetime/ist'
import { resolveOAuthPictureUrl } from '@/lib/profile/user-display'
import { resolveProfileOnboarding } from '@/lib/profile/onboarding-state'
import type { PlanTier } from '@/types/app.types'
import type { User } from '@supabase/supabase-js'

export async function DashboardPageBody({ user }: { user: User }) {
  const {
    userData,
    interviewsRaw,
    rows,
    completedCount,
    recoveryTarget,
    retentionDashboardSnap,
    candidateSnapshot,
  } = await loadDashboardPageData(user.id)

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

  return (
    <>
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
          recoveryInterview={recoveryInterview}
        />

        <CreditsOverviewCard
          creditsRemaining={creditsRemaining}
          planTier={planTier}
          planExpiresAt={userData?.plan_expires_at ?? null}
          planStatus={userData?.plan_status ?? null}
          demotePracticeCta={Boolean(recoveryInterview)}
        />
      </div>

      <ProfileCompletionCard resolution={profileOnboarding} />

      <QuickActionsGrid resumeCompletionPct={candidateSnapshot.resumeCompletionPct} />

      <ReadinessOverviewCard readiness={readiness} />

      {profileOnboarding.state === 'complete' ? (
        <RecommendationsStrip roadmap={roadmap} />
      ) : null}

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
    </>
  )
}

export async function DashboardHeaderActionsFromData({ userId }: { userId: string }) {
  const { userData } = await loadDashboardPageData(userId)
  return (
    <DashboardHeaderActions
      creditsRemaining={userData?.credits_remaining ?? 0}
      planTier={userData?.plan_tier}
      planExpiresAt={userData?.plan_expires_at}
      planStatus={userData?.plan_status}
    />
  )
}
