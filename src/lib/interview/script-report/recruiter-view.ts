/**
 * Honest recruiter-facing badges derived from score-band / placement_signal.
 * No peer percentiles — labels are session-scoped.
 */

import {
  dimensionLabel,
  type PlacementSignal,
  type ScoreBand,
} from '@/lib/interview/script-report/aggregate';
import { strongestAndWeakestDimensions } from '@/lib/interview/script-report/radar';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import type { HiringSignal, ReadinessLevel, SignalStrength } from '@/types/app.types';

export function sessionHiringSignal(band: ScoreBand): HiringSignal {
  if (band === 'strong' || band === 'competitive') return 'hire';
  if (band === 'developing') return 'borderline';
  return 'reject';
}

export function sessionReadiness(signal: PlacementSignal): ReadinessLevel {
  if (signal === 'strong_signal' || signal === 'placement_competitive') return 'ready';
  if (signal === 'developing') return 'developing';
  return 'early_stage';
}

export function readinessBadgeLabel(level: ReadinessLevel): string {
  if (level === 'ready') return 'Placement Ready';
  if (level === 'developing') return 'Developing';
  return 'Early Stage';
}

export function hiringSignalBadgeLabel(signal: HiringSignal): string {
  if (signal === 'hire') return 'Hire Signal';
  if (signal === 'borderline') return 'Borderline';
  return 'Needs Prep';
}

/** Map a 0–10 dimension mean to Strong / Moderate / Weak for the signals grid. */
export function strengthFromScore(score: number): SignalStrength {
  if (score >= 7) return 'strong';
  if (score >= 5) return 'moderate';
  return 'weak';
}

export type DimensionSignalRow = {
  key: DimensionKey;
  label: string;
  strength: SignalStrength;
  score: number;
};

export function dimensionSignalRows(
  dimensionAverages: Record<DimensionKey, number>,
): DimensionSignalRow[] {
  return DIMENSION_KEYS.map((key) => ({
    key,
    label: dimensionLabel(key),
    strength: strengthFromScore(dimensionAverages[key]),
    score: dimensionAverages[key],
  }));
}

export function strongestWeakestLabels(
  dimensionAverages: Record<DimensionKey, number>,
): { strongest: string; weakest: string } {
  const { strongest, weakest } = strongestAndWeakestDimensions(dimensionAverages);
  return {
    strongest: dimensionLabel(strongest),
    weakest: dimensionLabel(weakest),
  };
}
