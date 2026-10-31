import type { InterviewWithReportsRow, ProgressInterviewRow, UserRow } from '@/app/(dashboard)/dashboard/dashboard-types'
import type { RetentionDashboardSnapshot } from '@/components/dashboard/RetentionProgressCard'
import {
  CANDIDATE_DASHBOARD_INTERVIEWS_SELECT,
  CANDIDATE_SNAPSHOT_ENROLLMENT_SELECT,
  CANDIDATE_SNAPSHOT_RESUMES_SELECT,
  CANDIDATE_SNAPSHOT_SCRIPT_REPORTS_SELECT,
  loadCandidateSnapshot,
  type CandidateSnapshotEnrollmentRow,
  type CandidateSnapshotResumeRow,
  type CandidateSnapshotScriptReportRow,
} from '@/lib/candidate/load-snapshot'
import type { CandidateSnapshot } from '@/lib/candidate/types'
import { fetchPrimaryRecoveryInterview } from '@/lib/interview/fetch-primary-recovery-interview'
import {
  dashboardPerfMark,
  dashboardPerfNow,
  timedDashboardSpan,
} from '@/lib/dashboard/perf-trace'
import {
  getCachedDashboardUserRow,
  getCachedSupabase,
  getCachedUserProgressRow,
} from '@/lib/dashboard/request-cache'
import { buildRetentionDashboardSnapFromRow } from '@/lib/retention/build-retention-dashboard-snap'
import type { UserProgressRow } from '@/lib/retention/types'
import type { PrimaryRecoveryTarget } from '@/lib/interview/fetch-primary-recovery-interview'
import { cache } from 'react'

export type DashboardScriptReport = CandidateSnapshotScriptReportRow

export type DashboardPageData = {
  userData: (UserRow & {
    onboarding_draft?: unknown
    candidate_profile?: unknown
    campus_org_id?: string | null
  }) | null
  userError: { message: string } | null
  interviewsRaw: InterviewWithReportsRow[]
  rows: InterviewWithReportsRow[]
  /** 50 most recent completed interviews — used for 7d/30d progress window stats. */
  progressInterviews: ProgressInterviewRow[]
  completedCount: number
  recoveryTarget: PrimaryRecoveryTarget | null
  retentionDashboardSnap: RetentionDashboardSnapshot | null
  progressTableMissing: boolean
  candidateSnapshot: CandidateSnapshot
}

/**
 * Single dashboard load: independent reads in wave 1, id-dependent reads in
 * wave 2, then snapshot assembly with no extra database round-trips.
 * Request-scoped `cache()` so header actions and the body Suspense share one fetch.
 */
export const loadDashboardPageData = cache(async function loadDashboardPageData(
  userId: string,
): Promise<DashboardPageData> {
  const loaderStarted = dashboardPerfNow()
  const supabase = await getCachedSupabase()

  // Progress Overview shows 7d/30d windows plus a delta against the *preceding*
  // window, so 60 days is the real data requirement. Bounding by date keeps the
  // read on the (user_id, status, started_at) index instead of walking back
  // through unbounded history for a fixed row count.
  const progressWindowStart = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const wave1Started = dashboardPerfNow()
  const [
    { data: userData, error: userError },
    { data: interviewsRaw },
    { data: progressSnap, error: progressErr },
    { count: completedCountTotal },
    recoveryTarget,
    { data: resumes },
    { data: enrollment },
    { data: progressInterviewsRaw },
  ] = await Promise.all([
    timedDashboardSpan('wave1.userRow', () => getCachedDashboardUserRow(userId), {
      cached: true,
    }),
    timedDashboardSpan('wave1.interviews', () =>
      supabase
        .from('interviews')
        .select(CANDIDATE_DASHBOARD_INTERVIEWS_SELECT)
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20),
    ),
    timedDashboardSpan('wave1.progress', () => getCachedUserProgressRow(userId), {
      cached: true,
    }),
    timedDashboardSpan('wave1.completedCount', () =>
      supabase
        .from('interviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed'),
    ),
    timedDashboardSpan('wave1.recovery', () =>
      fetchPrimaryRecoveryInterview(supabase, userId),
    ),
    timedDashboardSpan('wave1.resumes', () =>
      supabase
        .from('resumes')
        .select(CANDIDATE_SNAPSHOT_RESUMES_SELECT)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
    ),
    timedDashboardSpan('wave1.enrollment', () =>
      supabase
        .from('college_enrollments')
        .select(CANDIDATE_SNAPSHOT_ENROLLMENT_SELECT)
        .eq('user_id', userId)
        .eq('enrollment_status', 'active')
        .maybeSingle(),
    ),
    timedDashboardSpan('wave1.progressInterviews', () =>
      supabase
        .from('interviews')
        .select('id, started_at, completed_at, engine, reports(id, overall_score, generated_at)')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('started_at', progressWindowStart)
        .order('started_at', { ascending: false })
        .limit(60),
    ),
  ])
  dashboardPerfMark('wave1', wave1Started, { queryCount: 8, wave: 1 })

  const progressTableMissing = Boolean(
    progressErr &&
      (String(progressErr.code) === '42P01' ||
        (/user_progress/i.test(progressErr.message ?? '') &&
          /does not exist/i.test(progressErr.message ?? ''))),
  )

  const interviewRows = (interviewsRaw ?? []) as InterviewWithReportsRow[]
  const progressInterviewRows = (progressInterviewsRaw ?? []) as ProgressInterviewRow[]
  const interviewIds = interviewRows.map((row) => row.id)
  // Union with progress interview IDs so wave2 fetches script reports for all of them.
  const allScriptReportIds = [...new Set([...interviewIds, ...progressInterviewRows.map((r) => r.id)])]
  const enrollmentCollegeId =
    enrollment && typeof enrollment.college_id === 'string' ? enrollment.college_id : null
  const userCampusOrgId =
    userData && typeof userData.campus_org_id === 'string' ? userData.campus_org_id : null
  const orgId = enrollmentCollegeId ?? userCampusOrgId

  const wave2Started = dashboardPerfNow()
  const [scriptReportsResult, orgResult, retentionDashboardSnap] = await Promise.all([
    timedDashboardSpan('wave2.scriptReports', () =>
      allScriptReportIds.length > 0
        ? supabase
            .from('script_interview_reports')
            .select(CANDIDATE_SNAPSHOT_SCRIPT_REPORTS_SELECT)
            .in('interview_id', allScriptReportIds)
            .in('status', ['ready', 'partial'])
        : Promise.resolve({
            data: [] as CandidateSnapshotScriptReportRow[],
          }),
    ),
    timedDashboardSpan('wave2.campusOrg', () =>
      orgId
        ? supabase.from('campus_organizations').select('name').eq('id', orgId).maybeSingle()
        : Promise.resolve({ data: null }),
    ),
    timedDashboardSpan('wave2.retention', () =>
      progressTableMissing
        ? Promise.resolve(null)
        : buildRetentionDashboardSnapFromRow(
            (progressSnap as UserProgressRow | null) ?? null,
            userId,
            supabase,
          ),
    ),
  ])
  dashboardPerfMark('wave2', wave2Started, { queryCount: 3, wave: 2 })

  const scriptReportsRaw = (scriptReportsResult.data ??
    []) as CandidateSnapshotScriptReportRow[]

  const scriptByInterview = new Map<string, InterviewWithReportsRow['script_interview_reports']>()
  for (const report of scriptReportsRaw) {
    const list = scriptByInterview.get(report.interview_id) ?? []
    list.push({
      id: report.id,
      overall: report.overall,
      generated_at: report.generated_at,
      status: report.status,
    })
    scriptByInterview.set(report.interview_id, list)
  }

  // All 20 fetched interviews, fully joined with v2.1 reports — NOT pre-sliced.
  // Display sections (Recent Activity top-3, Score Trend last-5) already slice
  // client-side via pickRecentInterviews()/`.slice(-5)`; Progress Overview's
  // period windowing (7d/30d/all-time) needs the full set to be accurate.
  // This is zero extra queries: script_interview_reports was already fetched
  // for every interview id in wave 2 — previously discarded past the first 5.
  const rows: InterviewWithReportsRow[] = interviewRows.map((row) => ({
    ...row,
    script_interview_reports: scriptByInterview.get(row.id) ?? [],
  }))

  const snapshotStarted = dashboardPerfNow()
  const candidateSnapshot = await loadCandidateSnapshot(userId, {
    client: supabase,
    userRow: userData
      ? {
          onboarding_draft: userData.onboarding_draft,
          candidate_profile:
            'candidate_profile' in userData ? userData.candidate_profile : undefined,
          campus_org_id:
            'campus_org_id' in userData
              ? ((userData.campus_org_id as string | null | undefined) ?? null)
              : null,
        }
      : null,
    progressSnap: progressTableMissing
      ? null
      : ((progressSnap as UserProgressRow | null) ?? null),
    interviews: interviewRows,
    recoveryTarget,
    completedSessionCount: completedCountTotal ?? 0,
    resumes: (resumes ?? []) as CandidateSnapshotResumeRow[],
    enrollment: (enrollment as CandidateSnapshotEnrollmentRow | null) ?? null,
    scriptReports: scriptReportsRaw,
    collegeOrgName: (orgResult.data?.name as string | undefined) ?? null,
  })
  dashboardPerfMark('snapshot.assemble', snapshotStarted, { skipped: true })
  dashboardPerfMark('loader.total', loaderStarted)

  if (userError) {
    console.error('dashboard user fetch', userError.message)
  }
  if (progressErr && !progressTableMissing) {
    console.error('dashboard user_progress fetch', progressErr.message)
  }

  // Enrich progressInterviews with script_interview_reports from the shared wave2 fetch.
  const progressInterviewsEnriched = progressInterviewRows.map((row) => ({
    ...row,
    script_interview_reports: scriptByInterview.get(row.id) ?? [],
  }))

  return {
    userData: userData ?? null,
    userError: userError ?? null,
    interviewsRaw: interviewRows,
    rows,
    progressInterviews: progressInterviewsEnriched,
    completedCount: completedCountTotal ?? 0,
    recoveryTarget,
    retentionDashboardSnap,
    progressTableMissing,
    candidateSnapshot,
  }
})
