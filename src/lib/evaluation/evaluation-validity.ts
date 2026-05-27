import type { DimensionScores } from '@/types/app.types';

/** Shared definition of “valid evaluation row” — DB + aggregation + completion backfill. */
export function isCompleteDimensionScores(dims: unknown): dims is DimensionScores {
  if (!dims || typeof dims !== 'object') return false;
  const d = dims as Record<string, unknown>;
  return (
    typeof d.communication_clarity === 'number' &&
    Number.isFinite(d.communication_clarity) &&
    typeof d.technical_depth === 'number' &&
    Number.isFinite(d.technical_depth) &&
    typeof d.answer_structure === 'number' &&
    Number.isFinite(d.answer_structure) &&
    typeof d.confidence === 'number' &&
    Number.isFinite(d.confidence) &&
    typeof d.relevance === 'number' &&
    Number.isFinite(d.relevance)
  );
}

export interface EvaluationRowShape {
  overall_score?: unknown;
  dimension_scores?: unknown;
}

export function isValidPersistedEvaluation(e: EvaluationRowShape): boolean {
  const score = e.overall_score;
  return (
    typeof score === 'number' &&
    Number.isFinite(score) &&
    isCompleteDimensionScores(e.dimension_scores ?? null)
  );
}
