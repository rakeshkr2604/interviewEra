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
import type { DimensionScores } from '@/types/app.types';
import { normalizeRadarRowToDimensionKey } from '@/lib/utils/report-radar-dimensions';

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

export async function loadCandidateSnapshot(userId: string): Promise<CandidateSnapshot> {
  const supabase = await createClient();

  let userRow:
    | {
        onboarding_draft?: unknown;
        candidate_profile?: unknown;
        campus_org_id?: string | null;
      }
    | null = null;

  const userFull = await supabase
    .from('users')
    .select('onboarding_draft, candidate_profile, campus_org_id')
    .eq('id', userId)
    .maybeSingle();

  if (!userFull.error && userFull.data) {
    userRow = userFull.data;
  } else if (
    userFull.error &&
    /candidate_profile/i.test(userFull.error.message ?? '')
  ) {
    const userFallback = await supabase
      .from('users')
      .select('onboarding_draft, campus_org_id')
      .eq('id', userId)
      .maybeSingle();
    userRow = userFallback.data ?? null;
  } else {
    userRow = userFull.data ?? null;
  }

  const [
    { data: progressSnap },
    { data: resumes },
    { data: interviews },
    { data: enrollment },
  ] = await Promise.all([
    supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    supabase
      .from('resumes')
      .select('id, status, created_at, file_url, parsed_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('interviews')
      .select('id, role, status, reports(id, radar_data, generated_at)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(20),
    supabase
      .from('college_enrollments')
      .select('enrollment_status, college_id')
      .eq('user_id', userId)
      .eq('enrollment_status', 'active')
      .maybeSingle(),
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

  const latestResumeRow = resumes?.[0] ?? null;
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
      fileUrl: (latestResumeRow.file_url as string | null) ?? null,
      parsed,
      parseQuality: parsed?.parse_quality ?? null,
      parseWarning: parsed?.parse_warning ?? null,
    };
  }

  const completedInterviews = (interviews ?? []).filter((i) => i.status === 'completed');
  const inProgress = (interviews ?? []).find((i) => i.status !== 'completed') ?? null;

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
    resumeCompletionPct: resumeCompletionPct(latestResume),
    progress: (progressSnap as UserProgressRow | null) ?? null,
    completedSessionCount: completedInterviews.length,
    inProgressInterviewId: inProgress ? (inProgress.id as string) : null,
    inProgressInterviewRole: inProgress ? (inProgress.role as string) : null,
    dimensionAverages: aggregateDimensionAverages(radarRows),
    recentReportIds,
    collegeEnrollmentAccepted: enrollment?.enrollment_status === 'active',
    collegeName: collegeOrgName,
  };

  return snapshot;
}
