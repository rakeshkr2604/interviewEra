import { redirect } from 'next/navigation'
import { privatePageMetadata } from '@/lib/seo/metadata'
import {
  getCachedAuthUser,
  getCachedSupabase,
  getCachedUserProgressRow,
} from '@/lib/dashboard/request-cache'
import { fetchRecentCompletedInterviewIds } from '@/lib/candidate/completed-interviews'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import { AnalyticsScoreTrendChart } from '@/components/dashboard/AnalyticsScoreTrendChart'
import { AnalyticsSkillBreakdown } from '@/components/dashboard/AnalyticsSkillBreakdown'
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions'
import { V1_KEY_TO_RUBRIC_KEY } from '@/lib/interview/script-dimension-bridge'
import { buildRetentionDashboardSnapFromRow } from '@/lib/retention/build-retention-dashboard-snap'
import type { UserProgressRow } from '@/lib/retention/types'
import {
  averageDimensions,
  computeImprovementPercent,
  mergeAnalyticsReports,
} from '@/lib/candidate/analytics-reports'

export const metadata = privatePageMetadata({
  title: 'Analytics',
  description: 'Performance analytics and trends for your mock interviews.',
  path: '/analytics',
})

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const user = await getCachedAuthUser()
  if (!user) redirect('/login')
  const supabase = await getCachedSupabase()

  const [{ data: progressSnap, error: progressErr }, completedInterviewIds] =
    await Promise.all([
      getCachedUserProgressRow(user.id),
      fetchRecentCompletedInterviewIds(supabase, user.id),
    ])

  const [{ data: v1Reports }, { data: scriptReports }] =
    completedInterviewIds.length > 0
      ? await Promise.all([
          supabase
            .from('reports')
            .select('overall_score, radar_data, generated_at, interview_id')
            .in('interview_id', completedInterviewIds)
            .order('generated_at', { ascending: false })
            .limit(20),
          supabase
            .from('script_interview_reports')
            .select('overall, dimension_averages, generated_at, interview_id, status')
            .in('interview_id', completedInterviewIds)
            .in('status', ['ready', 'partial'])
            .order('generated_at', { ascending: false })
            .limit(20),
        ])
      : [{ data: [] }, { data: [] }]

  const orderedReports = mergeAnalyticsReports(
    (v1Reports ?? []) as Parameters<typeof mergeAnalyticsReports>[0],
    (scriptReports ?? []) as Parameters<typeof mergeAnalyticsReports>[1],
    5,
  )

  const baseline = orderedReports[0]?.overallScore ?? null
  const latest = orderedReports[orderedReports.length - 1]?.overallScore ?? null
  const improvement = computeImprovementPercent(baseline, latest)

  const skillRows = averageDimensions(orderedReports)
  // Same shape serves both the inline Skill Breakdown card and the
  // RetentionProgressCard "See details" dialog — one source, no duplication.
  const skills = skillRows.slice(0, 5).map((row) => ({
    rubricKey: V1_KEY_TO_RUBRIC_KEY[row.key],
    name: REPORT_DIMENSION_LABELS[row.key],
    pct: Math.round(row.avg * 10),
  }))
  const skillDetailRows = skills

  const trendPoints = orderedReports.map((report, idx) => ({
    label: `#${idx + 1}`,
    score: report.overallScore,
    dateLabel: report.generatedAt
      ? new Date(report.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : '—',
  }))

  const hasTrend = trendPoints.length >= 2

  const progressTableMissing = Boolean(
    progressErr &&
      (String(progressErr.code) === '42P01' ||
        (/user_progress/i.test(progressErr.message ?? '') &&
          /does not exist/i.test(progressErr.message ?? ''))),
  )

  const retentionDashboardSnapBase = progressTableMissing
    ? null
    : await buildRetentionDashboardSnapFromRow(
        (progressSnap as UserProgressRow | null) ?? null,
        user.id,
        supabase,
      )
  const retentionDashboardSnap = retentionDashboardSnapBase
    ? { ...retentionDashboardSnapBase, skillBreakdown: skillDetailRows }
    : null

  if (progressErr && !progressTableMissing) {
    console.error('analytics user_progress fetch', progressErr.message)
  }

  return (
    <>
      <RetentionProgressRefreshListener />
      <DashboardPageHeader
        eyebrow="Insights"
        title="Performance analytics"
        subtitle="Score trend, skill breakdown, and improvement signals from your completed mocks."
      />

      <div className="-mt-4 mb-6">
        <RetentionProgressCard snap={retentionDashboardSnap} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Score Trend */}
        <div className="dashboard-premium-card lg:col-span-2 px-6 py-5 sm:px-7">
          {!hasTrend ? (
            <>
              <div className="mb-4">
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Score trend
                </p>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {trendPoints.length === 1 ? 'Need 1 more mock for trend' : 'No trend yet'}
                </p>
              </div>
              <div
                className="flex flex-col items-center justify-center rounded-xl py-16"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Not enough data to chart a trend
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Complete 2 interviews to unlock a meaningful curve.
                </p>
              </div>
            </>
          ) : (
            <AnalyticsScoreTrendChart points={trendPoints} improvementPct={improvement} />
          )}
        </div>

        {/* Skill Breakdown */}
        <div className="dashboard-premium-card px-5 py-5 sm:px-6">
          <AnalyticsSkillBreakdown skills={skills} reportCount={orderedReports.length} />
        </div>
      </div>
    </>
  )
}
