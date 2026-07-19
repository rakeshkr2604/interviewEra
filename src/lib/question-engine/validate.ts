/**
 * Question Engine v2 — category-distribution validator.
 *
 * The system prompt asks for the distribution AND we enforce it in code:
 * a set that parses as valid JSON but skews (e.g. 9 technical / 1 behavioral)
 * counts as a validation failure for retry purposes, same as a zod failure.
 */

import type { QgQuestion } from './schemas';

/** Minimum share per category (10-question set → ≥3 technical, ≥2 behavioral, ≥2 situational). */
const MIN_RATIOS = {
  technical: 0.3,
  behavioral: 0.2,
  situational: 0.2,
} as const;

export type DistributionResult = { ok: true } | { ok: false; message: string };

export interface DistributionOptions {
  /**
   * Skip the ratio quotas entirely — for modes where a narrow, single-flavor
   * subject (e.g. topic mode's "SQL Joins") genuinely can't produce a
   * behavioral/situational split without the model inventing an awkward fit.
   * The set-size and non-empty checks (enforced by qgSetSchema + this
   * function's total===0 guard) still apply.
   */
  relaxed?: boolean;
}

export function validateCategoryDistribution(
  questions: readonly QgQuestion[],
  options?: DistributionOptions,
): DistributionResult {
  const total = questions.length;
  if (total === 0) return { ok: false, message: 'Set contains no questions.' };
  if (options?.relaxed) return { ok: true };

  const counts: Record<keyof typeof MIN_RATIOS, number> = {
    technical: 0,
    behavioral: 0,
    situational: 0,
  };
  for (const q of questions) {
    counts[q.category] += 1;
  }

  const problems: string[] = [];
  for (const [category, ratio] of Object.entries(MIN_RATIOS) as Array<
    [keyof typeof MIN_RATIOS, number]
  >) {
    const min = Math.max(1, Math.floor(total * ratio));
    if (counts[category] < min) {
      problems.push(
        `category "${category}" has ${counts[category]} question(s), needs at least ${min}`,
      );
    }
  }

  if (problems.length > 0) {
    return { ok: false, message: `Category distribution violated: ${problems.join('; ')}.` };
  }
  return { ok: true };
}
