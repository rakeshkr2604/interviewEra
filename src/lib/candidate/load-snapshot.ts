import { createClient } from '@/lib/supabase/server';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { parsePersistedDraft } from '@/lib/onboarding/persisted-draft';
import {
  defaultCandidateProfile,
  parseStoredCandidateProfile,
} from './candidate-profile';
import type {
  CandidateSnapshot,
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

export type CandidateSnapshotPrefetch = {
  userRow?: CandidateSnapshotUserRow | null;
  progressSnap?: UserProgressRow | null;
  interviews?: CandidateSnapshotInterviewRow[] | null;
  /** Independent of the recent-list window; when set, skips recovery DB fetch. */
  recoveryTarget?: PrimaryRecoveryTarget | null;
};

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

function aggregateDimensionAverages(
  radarRows: { dimension: string; score: number }[][],
): ReportDimensionAverages {
  const buckets: Record<keyof DimensionScores, number[]> = {
    communication_clarity: [],
    technical_depth: [],
    answer_structure: [],
    confidence: [],
    relevance: [],
  };

  for (const radar of radarRows) {
    for (const point of radar) {
      const key = normalizeRadarRowToDimensionKey(String(point.dimension ?? ''));
      if (!key) continue;
      const score = Number(point.score);
      if (!Number.isFinite(score)) continue;
      buckets[key].push(score);
    }
  }

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
  const supabase = await createClient();

  const userRow =
    prefetch && 'userRow' in prefetch
      ? (prefetch.userRow ?? null)
      : await fetchCandidateSnapshotUserRow(supabase, userId);

  const hasPrefetchedProgress = Boolean(prefetch && 'progressSnap' in prefetch);
  const hasPrefetchedInterviews = Boolean(prefetch && 'interviews' in prefetch);
  const hasPrefetchedRecovery = Boolean(prefetch && 'recoveryTarget' in prefetch);

  const [
    { data: progressSnap },
    { data: interviews },
    { data: resumes },
    { data: enrollment },
    recoveryTarget,
  ] = await Promise.all([
    hasPrefetchedProgress
      ? Promise.resolve({ data: prefetch!.progressSnap ?? null })
      : supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    hasPrefetchedInterviews
      ? Promise.resolve({ data: prefetch!.interviews ?? null })
      : supabase
          .from('interviews')
          .select('id, role, status, engine, reports(id, radar_data, generated_at)')
          .eq('user_id', userId)
          .order('started_at', { ascending: false })
          .limit(20),
    supabase
      .from('resumes')
      .select('id, status, created_at, storage_path, parsed_data, is_primary')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('college_enrollments')
      .select('enrollment_status, college_id')
      .eq('user_id', userId)
      .eq('enrollment_status', 'active')
      .maybeSingle(),
    hasPrefetchedRecovery
      ? Promise.resolve(prefetch!.recoveryTarget ?? null)
      : fetchPrimaryRecoveryInterview(supabase, userId),
  ]);

  const draft = parsePersistedDraft(userRow?.onboarding_draft ?? null);
  const storedProfile = parseStoredCandidateProfile(userRow?.candidate_profile ?? null);

  const orgId =
    (enrollment?.college_id as string | undefined) ??
    (userRow?.campus_org_id as string | undefined) ??
    null;
  let collegeOrgName: string | null = null;
  if (orgId) {
    const { data: org } = await supabase
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
        ? coerceParsedResume(latestResumeRow.parsed_data)
        : null;
    latestResume = {
      id: latestResumeRow.id as string,
      status: latestResumeRow.status as ResumeSnapshot['status'],
      createdAt: latestResumeRow.created_at as string,
      // @deprecated — always null; use GET /api/resume/:id/file for downloads.
      fileUrl: null,
      parsed,
      parseQuality: parsed?.parse_quality ?? null,
      parseWarning: parsed?.parse_warning ?? null,
    };
  }

  const completedInterviews = (interviews ?? []).filter((i) => i.status === 'completed');
  // Recovery fields come from fetchPrimaryRecoveryInterview (not the recent-20 window).
  const recovery = recoveryTarget;
  const inProgress =
    recovery?.mode === 'continue'
      ? recovery
      : null;
  const abandonedResume =
    recovery?.mode === 'resume'
      ? recovery
      : null;

  const radarRows = completedInterviews.flatMap((interview) => {
    const reports = (interview.reports ?? []) as { radar_data?: { dimension: string; score: number }[] }[];
    return reports.map((r) => (Array.isArray(r.radar_data) ? r.radar_data : []));
  });

  const recentReportIds = completedInterviews
    .flatMap((interview) =>
      ((interview.reports ?? []) as { id: string }[]).map((r) => r.id),
    )
    .slice(0, 5);

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
    completedSessionCount: completedInterviews.length,
    inProgressInterviewId: inProgress ? inProgress.id : null,
    inProgressInterviewRole: inProgress ? inProgress.role : null,
    inProgressInterviewEngine: inProgress ? (inProgress.engine ?? null) : null,
    abandonedResumeInterviewId: abandonedResume ? abandonedResume.id : null,
    abandonedResumeInterviewRole: abandonedResume ? abandonedResume.role : null,
    abandonedResumeInterviewEngine: abandonedResume
      ? (abandonedResume.engine ?? null)
      : null,
    dimensionAverages: aggregateDimensionAverages(radarRows),
    recentReportIds,
    collegeEnrollmentAccepted: enrollment?.enrollment_status === 'active',
    collegeName: collegeOrgName,
  };

  return snapshot;
}
