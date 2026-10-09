import type { DimensionScores, ParsedResume } from '@/types/app.types';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import type {
  CandidateSnapshot,
  ReadinessCategoryScore,
  ReadinessScoreResult,
} from './types';

const CATEGORY_WEIGHTS: Record<ReadinessCategoryScore['key'], number> = {
  resume_quality: 0.15,
  interview_performance: 0.3,
  communication: 0.2,
  technical_depth: 0.2,
  consistency: 0.15,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Convert 0–10 scale to 0–100; null stays null (missing ≠ zero). */
function scoreFromTenPointScale(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return clampScore(value * 10);
}

function computeResumeQualityScore(resume: ParsedResume | null, completionPct: number): number {
  if (!resume) return clampScore(completionPct * 0.4);

  let score = 20;
  if (resume.parse_quality === 'full') score += 35;
  else if (resume.parse_quality === 'degraded') score += 22;
  else if (resume.parse_quality === 'minimal') score += 10;

  score += Math.min(20, resume.skills.length * 4);
  if (resume.experience_estimate && resume.experience_estimate !== 'Not specified') score += 10;
  if (resume.target_role.trim()) score += 10;

  return clampScore((score + completionPct) / 2);
}

function computeConsistencyScore(snapshot: CandidateSnapshot): number {
  const streak = snapshot.progress?.current_streak ?? 0;
  const sessions = snapshot.progress?.total_sessions ?? 0;
  const last5 = snapshot.progress?.last_5_sessions_avg ?? null;
  const overall = snapshot.progress?.overall_avg_score ?? null;

  let score = Math.min(40, streak * 8);
  score += Math.min(30, sessions * 5);

  if (last5 != null && overall != null) {
    const delta = last5 - overall;
    if (delta >= 0.3) score += 30;
    else if (delta >= 0) score += 20;
    else if (delta >= -0.3) score += 10;
  } else if (sessions > 0) {
    score += 15;
  }

  return clampScore(score);
}

function readinessLevel(overall: number): ReadinessScoreResult['level'] {
  if (overall >= 70) return 'ready';
  if (overall >= 45) return 'developing';
  return 'early_stage';
}

function improvementTrend(snapshot: CandidateSnapshot): ReadinessScoreResult['improvementTrend'] {
  const last5 = snapshot.progress?.last_5_sessions_avg ?? null;
  const overall = snapshot.progress?.overall_avg_score ?? null;
  if (last5 == null || overall == null || snapshot.completedSessionCount < 2) {
    return 'insufficient_data';
  }
  const delta = last5 - overall;
  if (delta >= 0.3) return 'improving';
  if (delta <= -0.3) return 'declining';
  return 'steady';
}

function trendLabel(trend: ReadinessScoreResult['improvementTrend']): string {
  switch (trend) {
    case 'improving':
      return 'Recent sessions are scoring above your lifetime average.';
    case 'declining':
      return 'Recent sessions trail your lifetime average — focus on weak dimensions.';
    case 'steady':
      return 'Scores are holding steady versus your average.';
    default:
      return 'Complete more mocks to establish a trend.';
  }
}

function weightedOverall(categories: ReadinessCategoryScore[]): number {
  const available = categories.filter((c) => c.hasEvidence && c.score != null);
  if (available.length === 0) return 0;
  const weightSum = available.reduce((sum, cat) => sum + CATEGORY_WEIGHTS[cat.key], 0);
  if (weightSum <= 0) return 0;
  const raw = available.reduce(
    (sum, cat) => sum + (cat.score as number) * CATEGORY_WEIGHTS[cat.key],
    0,
  );
  return clampScore(raw / weightSum);
}

export function computeReadinessScore(snapshot: CandidateSnapshot): ReadinessScoreResult {
  const dimValues = Object.values(snapshot.dimensionAverages).filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  const interviewAvg =
    snapshot.progress?.overall_avg_score ??
    (snapshot.completedSessionCount > 0 && dimValues.length > 0
      ? dimValues.reduce((a, b) => a + b, 0) / dimValues.length
      : null);

  const interviewScore = scoreFromTenPointScale(interviewAvg);
  const communicationScore = scoreFromTenPointScale(
    snapshot.dimensionAverages.communication_clarity,
  );
  const technicalScore = scoreFromTenPointScale(snapshot.dimensionAverages.technical_depth);

  const hasResumeEvidence =
    Boolean(snapshot.latestResume?.parsed) || snapshot.resumeCompletionPct > 0;
  const resumeScore = computeResumeQualityScore(
    snapshot.latestResume?.parsed ?? null,
    snapshot.resumeCompletionPct,
  );

  const hasConsistencyEvidence =
    (snapshot.progress?.total_sessions ?? 0) > 0 ||
    (snapshot.progress?.current_streak ?? 0) > 0 ||
    snapshot.completedSessionCount > 0;
  const consistencyScore = computeConsistencyScore(snapshot);

  const categories: ReadinessCategoryScore[] = [
    {
      key: 'resume_quality',
      label: 'Resume quality',
      score: hasResumeEvidence ? resumeScore : null,
      maxScore: 100,
      hasEvidence: hasResumeEvidence,
      summary: snapshot.latestResume?.parsed
        ? `Parsed resume with ${snapshot.latestResume.parsed.skills.length} skills identified.`
        : hasResumeEvidence
          ? 'Resume upload in progress or incomplete — finish parsing for a full score.'
          : 'Upload and parse a resume to unlock this dimension.',
    },
    {
      key: 'interview_performance',
      label: 'Interview performance',
      score: interviewScore,
      maxScore: 100,
      hasEvidence: interviewScore != null,
      summary:
        interviewScore != null && snapshot.completedSessionCount > 0
          ? `Based on ${snapshot.completedSessionCount} completed mock${snapshot.completedSessionCount === 1 ? '' : 's'}.`
          : 'No completed interviews with scores yet.',
    },
    {
      key: 'communication',
      label: 'Communication',
      score: communicationScore,
      maxScore: 100,
      hasEvidence: communicationScore != null,
      summary:
        snapshot.dimensionAverages.communication_clarity != null
          ? `Avg clarity ${snapshot.dimensionAverages.communication_clarity.toFixed(1)}/10 across reports.`
          : 'Communication scores appear after your first report.',
    },
    {
      key: 'technical_depth',
      label: 'Technical depth',
      score: technicalScore,
      maxScore: 100,
      hasEvidence: technicalScore != null,
      summary:
        snapshot.dimensionAverages.technical_depth != null
          ? `Avg technical depth ${snapshot.dimensionAverages.technical_depth.toFixed(1)}/10.`
          : 'Technical depth scores appear after your first report.',
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: hasConsistencyEvidence ? consistencyScore : null,
      maxScore: 100,
      hasEvidence: hasConsistencyEvidence,
      summary: `${snapshot.progress?.current_streak ?? 0}-day streak · ${snapshot.progress?.total_sessions ?? 0} completed sessions.`,
    },
  ];

  const overall = weightedOverall(categories);
  const trend = improvementTrend(snapshot);

  return {
    overall,
    level: readinessLevel(overall),
    categories,
    improvementTrend: trend,
    trendLabel: trendLabel(trend),
    computedAt: new Date().toISOString(),
  };
}

/**
 * Weakest dimensions among those with real scores.
 * Returns [] when no dimension evidence exists (do not invent “weak” areas).
 */
export function weakestDimensions(
  averages: CandidateSnapshot['dimensionAverages'],
  limit = 3,
): (keyof DimensionScores)[] {
  const entries = (Object.keys(REPORT_DIMENSION_LABELS) as (keyof DimensionScores)[])
    .map((key) => ({ key, score: averages[key] }))
    .filter((e): e is { key: keyof DimensionScores; score: number } => e.score != null)
    .sort((a, b) => a.score - b.score);
  return entries.slice(0, limit).map((e) => e.key);
}
