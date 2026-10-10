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
 *
 * Two persisted shapes exist:
 *   • Flat averages (report `dimension_averages`) — numbers per key
 *   • Per-answer audit rows (`answer_evaluations.dimensions`) — `{ score, note }`
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
  return SCRIPT_DIMENSION_KEYS.every(
    (key) => typeof obj[key] === 'number' && Number.isFinite(obj[key] as number),
  );
}

/**
 * Normalize either flat averages or per-answer `{ score, note }` objects into
 * flat score-v1.2 averages. Returns null when any dimension is missing/invalid.
 */
export function scriptEvalDimsToAverages(raw: unknown): ScriptDimensionAverages | null {
  if (isScriptDimensionAverages(raw)) return raw;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const out = {} as ScriptDimensionAverages;
  for (const key of SCRIPT_DIMENSION_KEYS) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[key] = v;
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const score = (v as { score?: unknown }).score;
      if (typeof score === 'number' && Number.isFinite(score)) {
        out[key] = score;
        continue;
      }
    }
    return null;
  }
  return out;
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

/**
 * Map a per-answer `answer_evaluations.dimensions` blob (or flat averages) onto
 * V1 DimensionScores for retention / Insights.
 */
export function scriptEvalDimsToV1Shape(raw: unknown): DimensionScores | null {
  const averages = scriptEvalDimsToAverages(raw);
  if (!averages) return null;
  return scriptDimsToV1Shape(averages);
}
