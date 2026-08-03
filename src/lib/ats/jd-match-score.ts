/**
 * Pure JD Match score assembly — kept separate so the formula is unit-testable
 * without LLM/embeddings.
 *
 * Weights (judgment, documented):
 * - required exact/normalized coverage: 45
 * - preferred exact/normalized coverage: 15
 * - jdRequirementCoverage (semantic JD→resume): 25
 * - resumeFocusAlignment (semantic resume→JD): 15
 */

export const JD_MATCH_WEIGHTS = {
  requiredExact: 45,
  preferredExact: 15,
  jdRequirementSemantic: 25,
  resumeFocusSemantic: 15,
} as const;

export interface JdMatchScoreParts {
  /** 0–100 */
  requiredCoverage: number;
  /** 0–100 */
  preferredCoverage: number;
  /** 0–100 */
  jdRequirementCoverage: number;
  /** 0–100 */
  resumeFocusAlignment: number;
}

export interface JdMatchScoreBreakdown {
  score: number;
  formula: string;
  contributions: {
    requiredExact: number;
    preferredExact: number;
    jdRequirementSemantic: number;
    resumeFocusSemantic: number;
  };
}

function clamp01(pct: number): number {
  return Math.max(0, Math.min(100, pct)) / 100;
}

export interface JdMatchScoreOptions {
  /**
   * When structured requirement extraction degraded (empty lists from a failed
   * LLM call), the exact-overlap components carry no signal. Semantic-only mode
   * zeroes them and renormalizes the semantic weights to a 100-point scale
   * (25/15 → 62.5/37.5) so the score reflects only what was actually measured.
   */
  semanticOnly?: boolean;
}

export function reconstructJdMatchScore(
  parts: JdMatchScoreParts,
  options?: JdMatchScoreOptions,
): JdMatchScoreBreakdown {
  const r = clamp01(parts.requiredCoverage);
  const p = clamp01(parts.preferredCoverage);
  const j = clamp01(parts.jdRequirementCoverage);
  const f = clamp01(parts.resumeFocusAlignment);

  if (options?.semanticOnly) {
    const semanticTotal =
      JD_MATCH_WEIGHTS.jdRequirementSemantic + JD_MATCH_WEIGHTS.resumeFocusSemantic;
    const jdWeight = (JD_MATCH_WEIGHTS.jdRequirementSemantic / semanticTotal) * 100;
    const focusWeight = (JD_MATCH_WEIGHTS.resumeFocusSemantic / semanticTotal) * 100;
    const contributions = {
      requiredExact: 0,
      preferredExact: 0,
      jdRequirementSemantic: j * jdWeight,
      resumeFocusSemantic: f * focusWeight,
    };
    const raw = contributions.jdRequirementSemantic + contributions.resumeFocusSemantic;
    return {
      score: Math.round(Math.min(100, Math.max(0, raw))),
      formula: 'semantic-only: jdRequirementSemantic×62.5 + resumeFocusSemantic×37.5',
      contributions: {
        requiredExact: 0,
        preferredExact: 0,
        jdRequirementSemantic: Math.round(contributions.jdRequirementSemantic * 100) / 100,
        resumeFocusSemantic: Math.round(contributions.resumeFocusSemantic * 100) / 100,
      },
    };
  }

  const contributions = {
    requiredExact: r * JD_MATCH_WEIGHTS.requiredExact,
    preferredExact: p * JD_MATCH_WEIGHTS.preferredExact,
    jdRequirementSemantic: j * JD_MATCH_WEIGHTS.jdRequirementSemantic,
    resumeFocusSemantic: f * JD_MATCH_WEIGHTS.resumeFocusSemantic,
  };

  const raw =
    contributions.requiredExact +
    contributions.preferredExact +
    contributions.jdRequirementSemantic +
    contributions.resumeFocusSemantic;

  return {
    score: Math.round(Math.min(100, Math.max(0, raw))),
    formula:
      'requiredExact×45 + preferredExact×15 + jdRequirementSemantic×25 + resumeFocusSemantic×15',
    contributions: {
      requiredExact: Math.round(contributions.requiredExact * 100) / 100,
      preferredExact: Math.round(contributions.preferredExact * 100) / 100,
      jdRequirementSemantic: Math.round(contributions.jdRequirementSemantic * 100) / 100,
      resumeFocusSemantic: Math.round(contributions.resumeFocusSemantic * 100) / 100,
    },
  };
}
