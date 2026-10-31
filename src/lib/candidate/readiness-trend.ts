/**
 * Historical readiness-score trend, derived from real per-report data —
 * never fabricated. Resume quality and consistency don't have a clean
 * historical reconstruction (no per-session resume/streak snapshots are
 * stored) and rarely swing session-to-session, so each trend point holds
 * them at their CURRENT value while interview performance, communication,
 * and technical depth — which genuinely vary per session — are recomputed
 * from the cumulative average up to that point in time. This is a
 * documented approximation, not a claim of full historical accuracy.
 */

import type { DimensionScores } from '@/types/app.types';
import { CATEGORY_WEIGHTS, clampScore, weightedOverall } from './readiness-score';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import type { ReadinessCategoryScore } from './types';

export interface ReadinessHistoryReport {
  generatedAt: string | null;
  /** 0–10 scale. */
  overallScore: number;
  /** 0–10 scale, when present on that report. */
  communicationClarity: number | null;
  /** 0–10 scale, when present on that report. */
  technicalDepth: number | null;
  /**
   * Remaining V1-shaped dimensions (0–10 scale) — kept alongside
   * communicationClarity/technicalDepth so Focus Areas can be recomputed
   * per-window too (same "no mix of windowed + lifetime data" rule as the
   * category cards).
   */
  answerStructure: number | null;
  confidence: number | null;
  relevance: number | null;
}

export interface ReadinessTrendPoint {
  dateLabel: string;
  /** Raw ISO timestamp (or null) — for client-side window filtering; dateLabel is for display only. */
  dateIso: string | null;
  score: number;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function buildCategories(
  resumeScore: number,
  interviewAvg: number | null,
  commAvg: number | null,
  techAvg: number | null,
  consistencyScore: number,
): ReadinessCategoryScore[] {
  const mk = (
    key: ReadinessCategoryScore['key'],
    score: number | null,
  ): ReadinessCategoryScore => ({
    key,
    label: '',
    score,
    maxScore: 100,
    summary: '',
    hasEvidence: score != null,
  });

  return [
    mk('resume_quality', resumeScore),
    mk('interview_performance', interviewAvg == null ? null : clampScore(interviewAvg * 10)),
    mk('communication', commAvg == null ? null : clampScore(commAvg * 10)),
    mk('technical_depth', techAvg == null ? null : clampScore(techAvg * 10)),
    mk('consistency', consistencyScore),
  ];
}

/**
 * Builds the point-by-point readiness trend. `reports` must be chronological
 * (oldest first) — same order `mergeAnalyticsReports` already returns.
 */
export function computeReadinessTrend(
  reports: ReadinessHistoryReport[],
  currentResumeScore: number,
  currentConsistencyScore: number,
): ReadinessTrendPoint[] {
  const interviewScores: number[] = [];
  const commScores: number[] = [];
  const techScores: number[] = [];

  return reports.map((r) => {
    interviewScores.push(r.overallScore);
    if (r.communicationClarity != null) commScores.push(r.communicationClarity);
    if (r.technicalDepth != null) techScores.push(r.technicalDepth);

    const categories = buildCategories(
      currentResumeScore,
      average(interviewScores),
      average(commScores),
      average(techScores),
      currentConsistencyScore,
    );

    return {
      dateLabel: r.generatedAt
        ? new Date(r.generatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : '—',
      dateIso: r.generatedAt,
      score: weightedOverall(categories),
    };
  });
}

/** Percent change from the first point to the last — null when not computable. */
export function computeTrendDeltaPercent(points: { score: number }[]): number | null {
  if (points.length < 2) return null;
  const baseline = points[0].score;
  const latest = points[points.length - 1].score;
  if (baseline <= 0) return null;
  return Math.round(((latest - baseline) / baseline) * 100);
}

/** Simple 0–10-scale category delta (first vs last report that has the dimension). */
export function computeCategoryDeltaPercent(values: number[]): number | null {
  const present = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (present.length < 2) return null;
  const baseline = present[0];
  const latest = present[present.length - 1];
  if (baseline <= 0) return null;
  return Math.round(((latest - baseline) / baseline) * 100);
}

export interface WindowedReadinessCategory {
  key: ReadinessCategoryScore['key'];
  score: number | null;
  deltaPercent: number | null;
  summary: string;
  /** True for resume_quality/consistency — not derivable per-session, held at lifetime value. */
  isLifetimeOnly: boolean;
}

export interface WindowedReadinessResult {
  overall: number;
  categories: WindowedReadinessCategory[];
  /** Human range description — "between 5 Oct – 30 Oct" / "no sessions in this window". */
  rangeLabel: string;
  sessionCount: number;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Recomputes the full readiness picture (overall + all 5 categories) scoped
 * to a report window — every number on the page should come from this when a
 * window is selected, not a mix of windowed-trend + lifetime-cards (that
 * split read as a bug: picking "Last 7 days" and seeing the 5 score cards
 * not move at all). `reports` must already be filtered to the window by the
 * caller (so `rangeLabel`/`sessionCount` reflect exactly what was passed).
 *
 * resume_quality and consistency have no per-session history to window (see
 * module doc) — they report the given lifetime score with
 * `isLifetimeOnly: true` so the UI can label them distinctly instead of
 * silently showing a stale number.
 */
export function computeWindowedReadiness(
  reports: ReadinessHistoryReport[],
  resumeScore: number,
  resumeSummary: string,
  consistencyScore: number,
  consistencySummary: string,
): WindowedReadinessResult {
  const sorted = [...reports].sort(
    (a, b) => Date.parse(a.generatedAt ?? '') - Date.parse(b.generatedAt ?? ''),
  );
  const dated = sorted.filter((r) => r.generatedAt);
  const dateSpan =
    dated.length === 0
      ? null
      : dated.length === 1
        ? `on ${formatShortDate(dated[0].generatedAt as string)}`
        : `between ${formatShortDate(dated[0].generatedAt as string)} – ${formatShortDate(dated[dated.length - 1].generatedAt as string)}`;
  const rangeLabel =
    dated.length === 0
      ? 'No sessions in this window'
      : `${dated.length} session${dated.length === 1 ? '' : 's'} ${dateSpan}`;

  const interviewScores = sorted.map((r) => r.overallScore);
  const commScores = sorted.map((r) => r.communicationClarity).filter((v): v is number => v != null);
  const techScores = sorted.map((r) => r.technicalDepth).filter((v): v is number => v != null);

  const interviewAvg = average(interviewScores);
  const commAvg = average(commScores);
  const techAvg = average(techScores);

  const interviewScore100 = interviewAvg == null ? null : clampScore(interviewAvg * 10);
  const commScore100 = commAvg == null ? null : clampScore(commAvg * 10);
  const techScore100 = techAvg == null ? null : clampScore(techAvg * 10);

  const categories: WindowedReadinessCategory[] = [
    {
      key: 'resume_quality',
      score: resumeScore,
      deltaPercent: null,
      summary: resumeSummary,
      isLifetimeOnly: true,
    },
    {
      key: 'interview_performance',
      score: interviewScore100,
      deltaPercent: computeCategoryDeltaPercent(interviewScores),
      summary:
        sorted.length > 0
          ? `Based on ${sorted.length} mock${sorted.length === 1 ? '' : 's'}${dateSpan ? ` ${dateSpan}` : ''}.`
          : 'No completed interviews in this window.',
      isLifetimeOnly: false,
    },
    {
      key: 'communication',
      score: commScore100,
      deltaPercent: computeCategoryDeltaPercent(commScores),
      summary:
        commAvg != null
          ? `Avg clarity ${commAvg.toFixed(1)}/10 across ${commScores.length} report${commScores.length === 1 ? '' : 's'} in this window.`
          : 'No communication scores in this window.',
      isLifetimeOnly: false,
    },
    {
      key: 'technical_depth',
      score: techScore100,
      deltaPercent: computeCategoryDeltaPercent(techScores),
      summary:
        techAvg != null
          ? `Avg technical depth ${techAvg.toFixed(1)}/10 across ${techScores.length} report${techScores.length === 1 ? '' : 's'} in this window.`
          : 'No technical depth scores in this window.',
      isLifetimeOnly: false,
    },
    {
      key: 'consistency',
      score: consistencyScore,
      deltaPercent: null,
      summary: consistencySummary,
      isLifetimeOnly: true,
    },
  ];

  const overall = weightedOverall(
    categories.map((c) => ({
      key: c.key,
      label: '',
      score: c.score,
      maxScore: 100,
      summary: '',
      hasEvidence: c.score != null,
    })),
  );

  return { overall, categories, rangeLabel, sessionCount: sorted.length };
}

export interface WindowedFocusArea {
  dimensionKey: keyof DimensionScores;
  name: string;
  pct: number;
}

/**
 * Weakest-N dimensions recomputed from the SAME windowed report set as the
 * category cards and trend chart — Focus Areas must move with the window
 * selector too, or it reads as stale/broken next to everything else that
 * updates (same lesson as the category-card fix above).
 */
export function computeWindowedFocusAreas(
  reports: ReadinessHistoryReport[],
  limit = 3,
): WindowedFocusArea[] {
  const keys: (keyof DimensionScores)[] = [
    'communication_clarity',
    'technical_depth',
    'answer_structure',
    'confidence',
    'relevance',
  ];
  const fieldByKey: Record<keyof DimensionScores, keyof ReadinessHistoryReport> = {
    communication_clarity: 'communicationClarity',
    technical_depth: 'technicalDepth',
    answer_structure: 'answerStructure',
    confidence: 'confidence',
    relevance: 'relevance',
  };

  return keys
    .map((key) => {
      const values = reports
        .map((r) => r[fieldByKey[key]] as number | null)
        .filter((v): v is number => v != null && Number.isFinite(v));
      const avg = average(values);
      return avg == null ? null : { dimensionKey: key, name: REPORT_DIMENSION_LABELS[key], pct: clampScore(avg * 10) };
    })
    .filter((row): row is WindowedFocusArea => row != null)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, limit);
}

export { CATEGORY_WEIGHTS };
