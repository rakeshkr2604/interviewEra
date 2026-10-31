import { createClient } from '@/lib/supabase/server';
import { parsePersistedDraft } from '@/lib/onboarding/persisted-draft';
import {
  defaultCandidateProfile,
  parseStoredCandidateProfile,
} from './candidate-profile';
import type {
  CandidateSnapshot,
  RecentReportRef,
  ReportDimensionAverages,
  ResumeSnapshot,
} from './types';
import type { UserProgressRow } from '@/lib/retention/types';
import {
  fetchPrimaryRecoveryInterview,
  type PrimaryRecoveryTarget,
} from '@/lib/interview/fetch-primary-recovery-interview';
import type { DimensionScores } from '@/types/app.types';
import { normalizeRadarRowToDimensionKey } from '@/lib/utils/report-radar-dimensions';
import { scriptReportDimsToV1Shape } from '@/lib/interview/script-dimension-bridge';

export type CandidateSnapshotUserRow = {
  onboarding_draft?: unknown;
  candidate_profile?: unknown;
  campus_org_id?: string | null;
};

export type CandidateSnapshotInterviewRow = {
  id: string;
  role: string;
  status: string;
  engine?: string | null;
  credit_deducted?: boolean | null;
  abandoned_resume_used?: boolean | null;
  reports?:
    | {
        id: string;
        radar_data?: { dimension: string; score: number }[];
        generated_at?: string | null;
      }[]
    | null;
};

export type CandidateSnapshotResumeRow = {
  id: string;
  status: string;
  created_at: string;
  storage_path: string | null;
  parsed_data: unknown;
  is_primary: boolean | null;
};

export type CandidateSnapshotEnrollmentRow = {
  enrollment_status: string;
  college_id: string | null;
};

export type CandidateSnapshotScriptReportRow = {
  id: string;
  interview_id: string;
  overall: number | null;
  dimension_averages: unknown;
  generated_at: string | null;
  status: string;
};

export type CandidateSnapshotPrefetch = {
  userRow?: CandidateSnapshotUserRow | null;
  progressSnap?: UserProgressRow | null;
  interviews?: CandidateSnapshotInterviewRow[] | null;
  /** Independent of the recent-list window; when set, skips recovery DB fetch. */
  recoveryTarget?: PrimaryRecoveryTarget | null;
  /** Lifetime completed interview count (bypass recent-window undercount). */
  completedSessionCount?: number | null;
  resumes?: CandidateSnapshotResumeRow[] | null;
  enrollment?: CandidateSnapshotEnrollmentRow | null;
  scriptReports?: CandidateSnapshotScriptReportRow[] | null;
  /** When the key is present, skip `campus_organizations` even if the value is null. */
  collegeOrgName?: string | null;
  /** Shared request client — avoids a second `createClient()` when the caller already has one. */
  client?: Awaited<ReturnType<typeof createClient>>;
};

export const CANDIDATE_SNAPSHOT_RESUMES_SELECT =
  'id, status, created_at, storage_path, parsed_data, is_primary' as const;

export const CANDIDATE_SNAPSHOT_ENROLLMENT_SELECT =
  'enrollment_status, college_id' as const;

export const CANDIDATE_SNAPSHOT_SCRIPT_REPORTS_SELECT =
  'id, interview_id, overall, dimension_averages, generated_at, status' as const;

/** Shared select for dashboard + snapshot interview hydration (20-row cap). */
export const CANDIDATE_DASHBOARD_INTERVIEWS_SELECT = `
  id,
  role,
  difficulty,
  status,
  completed_at,
  started_at,
  engine,
  credit_deducted,
  abandoned_resume_used,
  reports (
    id,
    overall_score,
    generated_at,
    radar_data
  )
`;

export async function fetchCandidateSnapshotUserRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<CandidateSnapshotUserRow | null> {
  const userFull = await supabase
    .from('users')
    .select('onboarding_draft, candidate_profile, campus_org_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userFull.error && userFull.data) {
    return userFull.data;
  }
  if (
    userFull.error &&
    /candidate_profile/i.test(userFull.error.message ?? '')
  ) {
    const userFallback = await supabase
      .from('users')
      .select('onboarding_draft, campus_org_id')
      .eq('id', userId)
      .maybeSingle();
    return userFallback.data ?? null;
  }
  return userFull.data ?? null;
}

const DASHBOARD_USER_DISPLAY_COLUMNS =
  'name, plan_tier, credits_remaining, plan_expires_at, plan_status, placement_date, created_at, avatar_path';

/** Single users fetch for dashboard display + candidate snapshot hydration. */
export async function fetchDashboardUserRow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const fullSelect = `${DASHBOARD_USER_DISPLAY_COLUMNS}, onboarding_draft, candidate_profile, campus_org_id`;
  const userFull = await supabase.from('users').select(fullSelect).eq('id', userId).single();

  if (!userFull.error) {
    return userFull;
  }
  if (/candidate_profile/i.test(userFull.error.message ?? '')) {
    return supabase
      .from('users')
      .select(`${DASHBOARD_USER_DISPLAY_COLUMNS}, onboarding_draft, campus_org_id`)
      .eq('id', userId)
      .single();
  }
  return userFull;
}

function emptyDimensionBuckets(): Record<keyof DimensionScores, number[]> {
  return {
    communication_clarity: [],
    technical_depth: [],
    answer_structure: [],
    confidence: [],
    relevance: [],
  };
}

function averagesFromBuckets(
  buckets: Record<keyof DimensionScores, number[]>,
): ReportDimensionAverages {
  const avg = (vals: number[]) =>
    vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  return {
    communication_clarity: avg(buckets.communication_clarity),
    technical_depth: avg(buckets.technical_depth),
    answer_structure: avg(buckets.answer_structure),
    confidence: avg(buckets.confidence),
    relevance: avg(buckets.relevance),
  };
}

function pushDimensionScores(
  buckets: Record<keyof DimensionScores, number[]>,
  dims: DimensionScores,
): void {
  for (const key of Object.keys(buckets) as (keyof DimensionScores)[]) {
    const score = dims[key];
    if (typeof score === 'number' && Number.isFinite(score)) {
      buckets[key].push(score);
    }
  }
}

function aggregateDimensionAveragesFromRadar(
  radarRows: { dimension: string; score: number }[][],
): Record<keyof DimensionScores, number[]> {
  const buckets = emptyDimensionBuckets();

  for (const radar of radarRows) {
    for (const point of radar) {
      const key = normalizeRadarRowToDimensionKey(String(point.dimension ?? ''));
      if (!key) continue;
      const score = Number(point.score);
      if (!Number.isFinite(score)) continue;
      buckets[key].push(score);
    }
  }

  return buckets;
}

function resumeCompletionPct(resume: ResumeSnapshot | null): number {
  if (!resume) return 0;
  if (resume.status === 'failed') return 25;
  if (resume.status === 'uploading' || resume.status === 'parsing') return 50;
  if (!resume.parsed) return 60;
  let pct = 70;
  if (resume.parsed.skills.length >= 3) pct += 10;
  if (resume.parsed.target_role.trim()) pct += 10;
  if (resume.parsed.experience_estimate !== 'Not specified') pct += 10;
  return Math.min(100, pct);
}

export async function loadCandidateSnapshot(
  userId: string,
  prefetch?: CandidateSnapshotPrefetch,
): Promise<CandidateSnapshot> {
  let supabase: Awaited<ReturnType<typeof createClient>> | null = prefetch?.client ?? null;
  const db = async () => {
    if (!supabase) supabase = await createClient();
    return supabase;
  };

  const userRow =
    prefetch && 'userRow' in prefetch
      ? (prefetch.userRow ?? null)
      : await fetchCandidateSnapshotUserRow(await db(), userId);

  const hasPrefetchedProgress = Boolean(prefetch && 'progressSnap' in prefetch);
  const hasPrefetchedInterviews = Boolean(prefetch && 'interviews' in prefetch);
  const hasPrefetchedRecovery = Boolean(prefetch && 'recoveryTarget' in prefetch);
  const hasPrefetchedCompletedCount = Boolean(
    prefetch && 'completedSessionCount' in prefetch,
  );
  const hasPrefetchedResumes = Boolean(prefetch && 'resumes' in prefetch);
  const hasPrefetchedEnrollment = Boolean(prefetch && 'enrollment' in prefetch);

  const [
    { data: progressSnap },
    { data: interviews },
    { data: resumes },
    { data: enrollment },
    recoveryTarget,
    completedCountResult,
  ] = await Promise.all([
    hasPrefetchedProgress
      ? Promise.resolve({ data: prefetch!.progressSnap ?? null })
      : (await db()).from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    hasPrefetchedInterviews
      ? Promise.resolve({ data: prefetch!.interviews ?? null })
      : (await db())
          .from('interviews')
          .select('id, role, status, engine, reports(id, radar_data, generated_at)')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(20),
    hasPrefetchedResumes
      ? Promise.resolve({ data: prefetch!.resumes ?? null })
      : (await db())
          .from('resumes')
          .select(CANDIDATE_SNAPSHOT_RESUMES_SELECT)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(5),
    hasPrefetchedEnrollment
      ? Promise.resolve({ data: prefetch!.enrollment ?? null })
      : (await db())
          .from('college_enrollments')
          .select(CANDIDATE_SNAPSHOT_ENROLLMENT_SELECT)
          .eq('user_id', userId)
          .eq('enrollment_status', 'active')
          .maybeSingle(),
    hasPrefetchedRecovery
      ? Promise.resolve(prefetch!.recoveryTarget ?? null)
      : fetchPrimaryRecoveryInterview(await db(), userId),
    hasPrefetchedCompletedCount
      ? Promise.resolve({ count: prefetch!.completedSessionCount ?? null })
      : (await db())
          .from('interviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'completed'),
  ]);

  const draft = parsePersistedDraft(userRow?.onboarding_draft ?? null);
  const storedProfile = parseStoredCandidateProfile(userRow?.candidate_profile ?? null);

  const orgId =
    (enrollment?.college_id as string | undefined) ??
    (userRow?.campus_org_id as string | undefined) ??
    null;
  let collegeOrgName: string | null = null;
  if (prefetch && 'collegeOrgName' in prefetch) {
    collegeOrgName = prefetch.collegeOrgName ?? null;
  } else if (orgId) {
    const { data: org } = await (await db())
      .from('campus_organizations')
      .select('name')
      .eq('id', orgId)
      .maybeSingle();
    collegeOrgName = (org?.name as string | undefined) ?? null;
  }
  const profile = {
    ...defaultCandidateProfile({
      role: draft?.role,
      experienceYears: draft?.experienceYears,
      collegeName: collegeOrgName ?? storedProfile.collegeName ?? null,
    }),
    ...storedProfile,
  };

  const latestResumeRow =
    (resumes ?? []).find((r) => r.is_primary && r.status === 'parsed') ??
    resumes?.[0] ??
    null;
  const hasActiveResume = (resumes ?? []).some(
    (resume) =>
      resume.status !== 'failed' &&
      typeof resume.storage_path === 'string' &&
      resume.storage_path.trim().length > 0,
  );
  let latestResume: ResumeSnapshot | null = null;
  if (latestResumeRow) {
    const parsed =
      latestResumeRow.status === 'parsed' && latestResumeRow.parsed_data
        ? null
        : null;
    latestResume = {
      id: latestResumeRow.id as string,
      status: latestResumeRow.status as ResumeSnapshot['status'],
      createdAt: latestResumeRow.created_at as string,
      // @deprecated — always null; use GET /api/resume/:id/file for downloads.
      fileUrl: null,
      parsed,
      parseQuality: null,
      parseWarning: null,
    };
  }

  const interviewRows = interviews ?? [];
  const completedInWindow = interviewRows.filter((i) => i.status === 'completed');
  const lifetimeCompleted =
    typeof completedCountResult.count === 'number'
      ? completedCountResult.count
      : completedInWindow.length;

  // Recovery fields come from fetchPrimaryRecoveryInterview (not the recent-20 window).
  const recovery = recoveryTarget;
  const inProgress = recovery?.mode === 'continue' ? recovery : null;
  const abandonedResume = recovery?.mode === 'resume' ? recovery : null;

  const completedIds = completedInWindow.map((i) => i.id as string);
  const prefetchedScriptReports =
    prefetch && 'scriptReports' in prefetch
      ? (prefetch.scriptReports ?? [])
      : null;
  const { data: scriptReportsRaw } =
    prefetchedScriptReports
      ? {
          data: prefetchedScriptReports.filter(
            (report) =>
              completedIds.includes(report.interview_id) &&
              (report.status === 'ready' || report.status === 'partial'),
          ),
        }
      : completedIds.length > 0
        ? await (await db())
            .from('script_interview_reports')
            .select(CANDIDATE_SNAPSHOT_SCRIPT_REPORTS_SELECT)
            .in('interview_id', completedIds)
            .in('status', ['ready', 'partial'])
        : { data: [] as CandidateSnapshotScriptReportRow[] };

  const scriptByInterview = new Map<
    string,
    {
      id: string;
      overall: number | null;
      dimension_averages: unknown;
      generated_at: string | null;
      status: string;
    }[]
  >();
  for (const r of scriptReportsRaw ?? []) {
    const list = scriptByInterview.get(r.interview_id as string) ?? [];
    list.push({
      id: r.id as string,
      overall: r.overall as number | null,
      dimension_averages: r.dimension_averages,
      generated_at: r.generated_at as string | null,
      status: r.status as string,
    });
    scriptByInterview.set(r.interview_id as string, list);
  }

  const dimBuckets = emptyDimensionBuckets();
  const recentReports: RecentReportRef[] = [];

  for (const interview of completedInWindow) {
    const engine = interview.engine === 'v2.1' ? 'v2.1' : 'v1';
    if (engine === 'v2.1') {
      const scriptReports = scriptByInterview.get(interview.id as string) ?? [];
      for (const report of scriptReports) {
        const mapped = scriptReportDimsToV1Shape(report.dimension_averages);
        if (mapped) pushDimensionScores(dimBuckets, mapped);
        recentReports.push({
          id: report.id,
          interviewId: interview.id as string,
          engine: 'v2.1',
          generatedAt: report.generated_at,
          href: `/report/script/${interview.id}`,
        });
      }
    } else {
      const reports = (interview.reports ?? []) as {
        id: string;
        radar_data?: { dimension: string; score: number }[];
        generated_at?: string | null;
      }[];
      for (const report of reports) {
        const radar = Array.isArray(report.radar_data) ? report.radar_data : [];
        const radarBuckets = aggregateDimensionAveragesFromRadar([radar]);
        for (const key of Object.keys(radarBuckets) as (keyof DimensionScores)[]) {
          dimBuckets[key].push(...radarBuckets[key]);
        }
        recentReports.push({
          id: report.id,
          interviewId: interview.id as string,
          engine: 'v1',
          generatedAt: report.generated_at ?? null,
          href: `/report/${report.id}`,
        });
      }
    }
  }

  recentReports.sort((a, b) => {
    const aTs = a.generatedAt ?? '';
    const bTs = b.generatedAt ?? '';
    return bTs.localeCompare(aTs);
  });
  const recentReportsTop = recentReports.slice(0, 5);

  const targetRole =
    profile.preferredRole ||
    latestResume?.parsed?.target_role ||
    draft?.role ||
    'Software Engineer';

  const snapshot: CandidateSnapshot = {
    userId,
    targetRole,
    profile,
    latestResume,
    hasActiveResume,
    resumeCompletionPct: resumeCompletionPct(latestResume),
    progress: (progressSnap as UserProgressRow | null) ?? null,
    completedSessionCount: lifetimeCompleted,
    inProgressInterviewId: inProgress ? inProgress.id : null,
    inProgressInterviewRole: inProgress ? inProgress.role : null,
    inProgressInterviewEngine: inProgress ? (inProgress.engine ?? null) : null,
    abandonedResumeInterviewId: abandonedResume ? abandonedResume.id : null,
    abandonedResumeInterviewRole: abandonedResume ? abandonedResume.role : null,
    abandonedResumeInterviewEngine: abandonedResume
      ? (abandonedResume.engine ?? null)
      : null,
    dimensionAverages: averagesFromBuckets(dimBuckets),
    recentReportIds: recentReportsTop.map((r) => r.id),
    recentReports: recentReportsTop,
    collegeEnrollmentAccepted: enrollment?.enrollment_status === 'active',
    collegeName: collegeOrgName,
  };

  return snapshot;
}
