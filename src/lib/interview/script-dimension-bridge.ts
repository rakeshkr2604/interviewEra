/**
 * Bridge score-v1.2 (script engine) dimensions onto the V1-shaped
 * `DimensionScores` used by candidate Insights, retention logs, and digests.
 *
 * Mapping (same as weekly digest):
 *   communication_clarity ← communication_clarity
 *   technical_depth       ← content_accuracy
 *   answer_structure      ← structure
 *   confidence            ← specificity
 *   relevance             ← relevance
 */

import {
  DIMENSION_KEYS as SCRIPT_DIMENSION_KEYS,
  type DimensionKey as ScriptDimensionKey,
} from '@/lib/interview/answer-score/rubric';
import type { DimensionScores } from '@/types/app.types';

export type ScriptDimensionAverages = Record<ScriptDimensionKey, number>;

export function isScriptDimensionAverages(
  raw: unknown,
): raw is ScriptDimensionAverages {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  return SCRIPT_DIMENSION_KEYS.every((key) => typeof obj[key] === 'number');
}

/** Map score-v1.2 session/report averages onto Insights/retention DimensionScores. */
export function scriptDimsToV1Shape(dims: ScriptDimensionAverages): DimensionScores {
  return {
    communication_clarity: dims.communication_clarity,
    technical_depth: dims.content_accuracy,
    answer_structure: dims.structure,
    confidence: dims.specificity,
    relevance: dims.relevance,
  };
}

/**
 * Normalize a script report `dimension_averages` JSON blob to V1 shape, or null
 * when the payload is incomplete / not score-v1.2.
 */
export function scriptReportDimsToV1Shape(raw: unknown): DimensionScores | null {
  if (!isScriptDimensionAverages(raw)) return null;
  return scriptDimsToV1Shape(raw);
}
