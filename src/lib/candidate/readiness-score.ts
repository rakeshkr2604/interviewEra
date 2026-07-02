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

function scoreFromTenPointScale(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0;
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

export function computeReadinessScore(snapshot: CandidateSnapshot): ReadinessScoreResult {
  const interviewAvg =
    snapshot.progress?.overall_avg_score ??
    (snapshot.completedSessionCount > 0
      ? Object.values(snapshot.dimensionAverages).filter((v) => v != null).reduce((a, b) => a + (b ?? 0), 0) /
        Math.max(1, Object.values(snapshot.dimensionAverages).filter((v) => v != null).length)
      : null);

  const categories: ReadinessCategoryScore[] = [
    {
      key: 'resume_quality',
      label: 'Resume quality',
      score: computeResumeQualityScore(snapshot.latestResume?.parsed ?? null, snapshot.resumeCompletionPct),
      maxScore: 100,
      summary: snapshot.latestResume?.parsed
        ? `Parsed resume with ${snapshot.latestResume.parsed.skills.length} skills identified.`
        : 'Upload and parse a resume to unlock full scoring.',
    },
    {
      key: 'interview_performance',
      label: 'Interview performance',
      score: scoreFromTenPointScale(interviewAvg),
      maxScore: 100,
      summary:
        snapshot.completedSessionCount > 0
          ? `Based on ${snapshot.completedSessionCount} completed mock${snapshot.completedSessionCount === 1 ? '' : 's'}.`
          : 'No completed interviews yet.',
    },
    {
      key: 'communication',
      label: 'Communication',
      score: scoreFromTenPointScale(snapshot.dimensionAverages.communication_clarity),
      maxScore: 100,
      summary: snapshot.dimensionAverages.communication_clarity != null
        ? `Avg clarity ${snapshot.dimensionAverages.communication_clarity.toFixed(1)}/10 across reports.`
        : 'Communication scores appear after your first report.',
    },
    {
      key: 'technical_depth',
      label: 'Technical depth',
      score: scoreFromTenPointScale(snapshot.dimensionAverages.technical_depth),
      maxScore: 100,
      summary: snapshot.dimensionAverages.technical_depth != null
        ? `Avg technical depth ${snapshot.dimensionAverages.technical_depth.toFixed(1)}/10.`
        : 'Technical depth scores appear after your first report.',
    },
    {
      key: 'consistency',
      label: 'Consistency',
      score: computeConsistencyScore(snapshot),
      maxScore: 100,
      summary: `${snapshot.progress?.current_streak ?? 0}-day streak · ${snapshot.progress?.total_sessions ?? 0} quality sessions.`,
    },
  ];

  const overall = clampScore(
    categories.reduce((sum, cat) => sum + cat.score * CATEGORY_WEIGHTS[cat.key], 0),
  );

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

export function weakestDimensions(
  averages: CandidateSnapshot['dimensionAverages'],
  limit = 3,
): (keyof DimensionScores)[] {
  const entries = (Object.keys(REPORT_DIMENSION_LABELS) as (keyof DimensionScores)[])
    .map((key) => ({ key, score: averages[key] ?? 10 }))
    .sort((a, b) => (a.score ?? 10) - (b.score ?? 10));
  return entries.slice(0, limit).map((e) => e.key);
}
