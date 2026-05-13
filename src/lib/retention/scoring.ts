/**
 * Pure scoring helpers — no I/O, no logging, fully deterministic.
 *
 * Used by tier-unlock.ts to derive the comparison numbers from raw session
 * rows. Kept in their own file because they're easy to unit-test.
 */

import type { DimensionScores } from '@/types/app.types';
import type { SessionQualityRow, ScoringSummary } from './types';
import { TIER_3_UNLOCK, SCORE_FALLBACK } from './constants';

const DIMENSION_KEYS: readonly (keyof DimensionScores)[] = [
  'communication_clarity',
  'technical_depth',
  'answer_structure',
  'confidence',
  'relevance',
];

/**
 * Returns the max of the 5 dimension scores. Returns null when input is
 * empty or malformed — callers must handle null explicitly (no silent zero).
 */
export function maxDimensionScore(
  dims: DimensionScores | Record<string, number> | null | undefined,
): number | null {
  if (!dims) return null;
  const numericValues = DIMENSION_KEYS.map((k) => {
    const v = (dims as Record<string, unknown>)[k];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }).filter((v): v is number => v !== null);

  if (numericValues.length === 0) return null;
  return Math.max(...numericValues);
}

/** Arithmetic mean of session_score over a list of session rows. Null if empty. */
export function meanSessionScore(rows: readonly SessionQualityRow[]): number | null {
  if (rows.length === 0) return null;
  const sum = rows.reduce((acc, r) => acc + (Number.isFinite(r.session_score) ? r.session_score : SCORE_FALLBACK), 0);
  return roundToTwo(sum / rows.length);
}

/** Last-N rolling average (most recent N by completed_at DESC ordering already applied). */
export function rollingAverage(
  rows: readonly SessionQualityRow[],
  windowSize: number = TIER_3_UNLOCK.rollingWindow,
): number | null {
  if (rows.length === 0) return null;
  const window = rows.slice(0, windowSize);
  return meanSessionScore(window);
}

/** Lifetime max dimension score across all session rows. */
export function lifetimeMaxDimensionScore(
  rows: readonly SessionQualityRow[],
): number | null {
  let best: number | null = null;
  for (const row of rows) {
    const candidate =
      typeof row.max_dimension_score === 'number'
        ? row.max_dimension_score
        : maxDimensionScore(row.dimension_scores as DimensionScores | Record<string, number>);
    if (candidate === null) continue;
    if (best === null || candidate > best) best = candidate;
  }
  return best;
}

/**
 * Build a ScoringSummary from session rows ordered DESC by completed_at.
 * Caller is responsible for ordering — keeping this pure means no I/O.
 */
export function summarize(rows: readonly SessionQualityRow[]): ScoringSummary {
  return {
    totalSessions: rows.length,
    overallAvg: meanSessionScore(rows),
    last5Avg: rollingAverage(rows, TIER_3_UNLOCK.rollingWindow),
    maxDimensionScoreLifetime: lifetimeMaxDimensionScore(rows),
  };
}

/** Two-decimal NUMERIC(4,2) match. */
export function roundToTwo(n: number): number {
  return Math.round(n * 100) / 100;
}
