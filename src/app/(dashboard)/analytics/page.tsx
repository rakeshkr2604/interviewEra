import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions'
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: completedInterviews }, { data: progressSnap, error: progressErr }] =
    await Promise.all([
      supabase
        .from('interviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed'),
      supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(),
    ])

  const completedInterviewIds = (completedInterviews ?? []).map((item) => item.id as string)

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
  const skills = skillRows.slice(0, 5).map((row) => ({
    name: REPORT_DIMENSION_LABELS[row.key],
    pct: Math.round(row.avg * 10),
  }))

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

  const retentionDashboardSnap = progressTableMissing
    ? null
    : await buildRetentionDashboardSnapFromRow(
        (progressSnap as UserProgressRow | null) ?? null,
        user.id,
      )

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
          <div className="flex items-center justify-between mb-4">
            <div>
              <p
                className="text-base font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Score trend
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Last 5 completed interviews
              </p>
            </div>
            {hasTrend && improvement != null ? (
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--accent-primary)' }}
              >
                {improvement >= 0 ? `+${improvement}%` : `${improvement}%`} improvement
              </p>
            ) : (
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                {trendPoints.length === 1 ? 'Need 1 more mock for trend' : 'No trend yet'}
              </p>
            )}
          </div>

          {!hasTrend ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-xl"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <p
                className="font-medium text-sm"
                style={{ color: 'var(--text-primary)' }}
              >
                Not enough data to chart a trend
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Complete 2 interviews to unlock a meaningful curve.
              </p>
            </div>
          ) : (
            <div
              className="h-48 rounded-xl px-4 py-5"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="flex h-full items-end justify-between gap-2">
                {trendPoints.map((point) => {
                  const safeScore = Math.max(0, Math.min(10, point.score))
                  return (
                    <div key={`${point.label}-${point.dateLabel}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                      <div
                        className="mx-auto w-full max-w-14 rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(8, safeScore * 10)}%`,
                          background: 'linear-gradient(180deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 65%, var(--accent-success) 35%))',
                        }}
                        title={`${safeScore.toFixed(1)}/10`}
                      />
                      <p className="mt-2 truncate text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {point.dateLabel}
                      </p>
                      <p className="text-center text-[10px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {safeScore.toFixed(1)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Skill Breakdown */}
        <div className="dashboard-premium-card px-5 py-5 sm:px-6">
          <p
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Skill breakdown
          </p>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Averages across the last {orderedReports.length || 0} report
            {orderedReports.length === 1 ? '' : 's'}
          </p>

          <div className="space-y-4">
            {skills.map((skill, i) => {
              const colors = [
                'var(--accent-primary)',
                'var(--accent-success)',
                'var(--accent-warning)',
                'var(--accent-danger)',
                'var(--text-secondary)',
              ]
              return (
                <div key={skill.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {skill.name}
                    </p>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: colors[i] }}
                    >
                      {`${skill.pct}%`}
                    </p>
                  </div>
                  <div
                    className="h-2 w-full rounded-full"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${skill.pct}%`,
                        background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[(i + 1) % colors.length]})`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {skills.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Skill-level data appears after report dimensions are generated.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
