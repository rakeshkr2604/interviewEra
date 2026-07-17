/**
 * Radar rows for score-v1.2 dimensions only — never Confidence / technical_depth.
 */

import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { dimensionLabel } from '@/lib/interview/script-report/aggregate';

/** Short axis labels so the pentagon stays readable on mobile. */
const RADAR_SHORT_LABEL: Record<DimensionKey, string> = {
  relevance: 'Relevance',
  content_accuracy: 'Accuracy',
  communication_clarity: 'Clarity',
  structure: 'Structure',
  specificity: 'Specificity',
};

export type ScriptRadarRow = {
  dimension: string;
  score: number;
  fullLabel: string;
};

export function scriptRadarChartRows(
  dimensionAverages: Record<DimensionKey, number>,
): ScriptRadarRow[] {
  return DIMENSION_KEYS.map((key) => ({
    dimension: RADAR_SHORT_LABEL[key],
    score: Number(dimensionAverages[key]) || 0,
    fullLabel: dimensionLabel(key),
  }));
}

export function strongestAndWeakestDimensions(
  dimensionAverages: Record<DimensionKey, number>,
): { strongest: DimensionKey; weakest: DimensionKey } {
  let strongest: DimensionKey = DIMENSION_KEYS[0];
  let weakest: DimensionKey = DIMENSION_KEYS[0];
  for (const key of DIMENSION_KEYS) {
    if (dimensionAverages[key] > dimensionAverages[strongest]) strongest = key;
    if (dimensionAverages[key] < dimensionAverages[weakest]) weakest = key;
  }
  return { strongest, weakest };
}
