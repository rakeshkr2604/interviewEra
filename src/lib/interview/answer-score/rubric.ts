/**
 * score-v1 — per-answer 5-dimension rubric for the v2.1 script engine.
 *
 * Validation + scoring math live here (pure, unit-tested). The LLM never
 * computes `overall`; application code derives it from the weighted mean so
 * the model cannot override the headline number.
 *
 * Dimensions & weights (approved design):
 *   relevance 0.20 · content_accuracy 0.30 · communication_clarity 0.15 ·
 *   structure 0.15 · specificity 0.20
 */

import { z } from 'zod';

// v1.1 (2026-07-17): content_accuracy contradiction hard-cap + unverifiable-story
// determinism; specificity relevance-0 hard rule + quantified-outcome 7/10 boundary.
// v1.2 (2026-07-17): relevance "topic ≠ answer" 3-anchor + correctness-irrelevant
// rule; STAR/logical_flow 0-vs-3 and 3-vs-5 boundaries made countable; the
// relevance-0 ⇒ specificity-0 rule is now ALSO enforced in code (the prompt-only
// hard rule was violated by the model — see validateAnswerScoreOutput).
// v1.6 (2026-08-13): STAR structure 0 must not mean "requested incident absent"
// (that's relevance). Prompt is primary; code floors structure 0→5 when
// relevance > 0 on the star rubric.
// Audit rows carry this so old-rubric and new-rubric scores are distinguishable.
export const ANSWER_SCORE_PROMPT_VERSION = 'score-v1.6';

/** STAR structure floor when the model zeros structure despite on-topic speech. */
export const STAR_STRUCTURE_RELEVANCE_FLOOR = 5;

export type QuestionType = 'technical' | 'behavioral';
export type SubRubric = 'star' | 'logical_flow';
export type QuestionTypeSource = 'tagged' | 'script_derived' | 'inferred' | 'fallback_default';

export const DIMENSION_KEYS = [
  'relevance',
  'content_accuracy',
  'communication_clarity',
  'structure',
  'specificity',
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export const DIMENSION_WEIGHTS: Record<DimensionKey, number> = {
  relevance: 0.2,
  content_accuracy: 0.3,
  communication_clarity: 0.15,
  structure: 0.15,
  specificity: 0.2,
};

/** Structure sub-rubric routed by question type. */
export function subRubricForQuestionType(questionType: QuestionType): SubRubric {
  return questionType === 'behavioral' ? 'star' : 'logical_flow';
}

// ── LLM output schema ─────────────────────────────────────────────────────────

const dimensionOutputSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(10)
    .refine((v) => Number.isInteger(v * 2), {
      message: 'score must be a multiple of 0.5',
    }),
  note: z.string().min(1).max(500),
});

export const answerScoreLlmSchema = z.object({
  // Optional: application injects the authoritative rubric before validate.
  // The LLM must not own routing — wrong/missing values are overwritten.
  sub_rubric: z.enum(['star', 'logical_flow']).optional(),
  dimensions: z.object({
    relevance: dimensionOutputSchema,
    content_accuracy: dimensionOutputSchema,
    communication_clarity: dimensionOutputSchema,
    structure: dimensionOutputSchema,
    specificity: dimensionOutputSchema,
  }),
  one_line_summary: z.string().min(1).max(300),
});

export type AnswerScoreLlmOutput = z.infer<typeof answerScoreLlmSchema>;

export type ScoredDimension = { score: number; note: string };

export type ValidatedAnswerScore = {
  dimensions: Record<DimensionKey, ScoredDimension>;
  /** Weighted mean, one decimal — computed here, never by the LLM. */
  overall: number;
  one_line_summary: string;
  score_suspect: boolean;
  suspect_reasons: string[];
};

export type AnswerScoreValidation =
  | { ok: true; value: ValidatedAnswerScore }
  | { ok: false; errors: string[] };

// ── Weighted overall (application-owned) ──────────────────────────────────────

export function computeOverall(dimensions: Record<DimensionKey, { score: number }>): number {
  let sum = 0;
  for (const key of DIMENSION_KEYS) {
    sum += dimensions[key].score * DIMENSION_WEIGHTS[key];
  }
  return Math.round(sum * 10) / 10;
}

// ── Contradiction heuristics (flag-only, never blocks the score) ──────────────
//
// v2 (clause-aware): the v1 heuristic flagged ANY negation word anywhere in a
// note, which produced a ~23% false-positive rate on the golden set — notes
// like "clear, no missing elements" on a legitimate 9 were flagged. v2 only
// treats language as criticism when the negation actually modifies the scored
// claim: a negative-quality word that is NOT itself negated ("incorrect",
// "vague"), or a negator directly negating a positive-quality word ("not
// clear", "no concrete examples"). "no errors" / "without rambling" are now
// correctly read as praise.

const NEGATORS = new Set([
  'not', 'no', 'never', 'none', 'nothing', 'without', 'barely', 'hardly',
  'cannot', "can't", "doesn't", "don't", "didn't", "isn't", "aren't", "wasn't", "won't",
]);

const NEGATIVE_QUALITY = new Set([
  'wrong', 'incorrect', 'inaccurate', 'false', 'error', 'errors', 'mistake', 'mistakes',
  'vague', 'unclear', 'confusing', 'rambling', 'rambles', 'irrelevant', 'generic',
  'weak', 'poor', 'missing', 'lacks', 'lacking', 'lacked', 'fails', 'failed', 'fail',
  'contradicts', 'contradiction', 'contradictory', 'contradict', 'contradicting',
  'contradicted', 'inconsistent', 'unsupported', 'misleading', 'incomplete',
  'absent', 'muddled', 'disorganized', 'tangential', 'unrelated', 'irrelevance',
]);

const POSITIVE_QUALITY = new Set([
  'excellent', 'outstanding', 'strong', 'clear', 'clearly', 'coherent', 'good', 'solid',
  'accurate', 'correct', 'thorough', 'precise', 'specific', 'specifics', 'detailed',
  'great', 'impressive', 'concrete', 'structured', 'organized', 'consistent',
  'relevant', 'supported', 'addresses', 'answers', 'complete', 'followable',
]);

/**
 * Hedges suppress praise ("only superficially addresses...") without being
 * criticism on their own — keeps the low-score praise check conservative.
 */
const HEDGES = new Set([
  'only', 'somewhat', 'partially', 'superficially', 'loosely', 'vaguely',
  'slightly', 'marginally', 'mostly', 'attempts', 'tries',
]);

/** How many tokens back a negator can sit and still negate the current word. */
const NEGATION_WINDOW = 2;

function tokenizeNote(note: string): string[] {
  return note.toLowerCase().match(/[a-z']+/g) ?? [];
}

function isNegatedAt(tokens: string[], index: number): boolean {
  for (let i = Math.max(0, index - NEGATION_WINDOW); i < index; i++) {
    if (NEGATORS.has(tokens[i])) return true;
  }
  return false;
}

/**
 * Relevance-flavored criticism ("off-topic", "irrelevant") criticizes the
 * CONTENT's relation to the question, not qualities like clarity — a note
 * "very clear but entirely off-topic" is consistent with clarity 10.
 */
const RELEVANCE_CRITICISM = new Set(['irrelevant', 'tangential', 'unrelated', 'irrelevance']);

/** True when the note actually criticizes the scored claim. */
export function noteCriticizes(
  note: string,
  opts?: { ignoreRelevanceCriticism?: boolean },
): boolean {
  if (!opts?.ignoreRelevanceCriticism && /\boff[- ]topic\b/i.test(note)) return true;
  const tokens = tokenizeNote(note);
  for (let i = 0; i < tokens.length; i++) {
    if (opts?.ignoreRelevanceCriticism && RELEVANCE_CRITICISM.has(tokens[i])) continue;
    // Unnegated negative-quality word: "explanation is incorrect".
    if (NEGATIVE_QUALITY.has(tokens[i]) && !isNegatedAt(tokens, i)) return true;
    // Negator directly negating a positive-quality word: "not clear",
    // "no concrete examples", "never addresses the question".
    if (POSITIVE_QUALITY.has(tokens[i]) && isNegatedAt(tokens, i)) return true;
  }
  return false;
}

/** True when the note praises the scored claim (unnegated, unhedged positive quality). */
export function notePraises(note: string): boolean {
  const tokens = tokenizeNote(note);
  for (let i = 0; i < tokens.length; i++) {
    if (!POSITIVE_QUALITY.has(tokens[i]) || isNegatedAt(tokens, i)) continue;
    let hedged = false;
    for (let j = Math.max(0, i - NEGATION_WINDOW); j < i; j++) {
      if (HEDGES.has(tokens[j])) { hedged = true; break; }
    }
    if (!hedged) return true;
  }
  return false;
}

/**
 * A note that contradicts its own score is a rubric-drift signal:
 * genuine criticism with a high score, or genuine praise (and no criticism)
 * with a very low score. Returns suspect reasons (empty = no contradiction).
 *
 * Low-score threshold is < 3 (not <= 3): every dimension's "3" anchor
 * explicitly describes partial presence of the quality ("exactly one on-topic
 * specific", "a story exists", "tangential") — so a 3 whose note names that
 * one positive element is anchor-consistent, not contradictory. Flagging it
 * produced a wave of false positives on golden-set runs (score-v1.2 tuning).
 */
export function findContradictions(
  dimensions: Record<DimensionKey, ScoredDimension>,
): string[] {
  const reasons: string[] = [];
  for (const key of DIMENSION_KEYS) {
    const { score, note } = dimensions[key];
    // Clarity judges followability, not on-topicness: "clear but off-topic"
    // with clarity 10 is anchor-consistent, not a contradiction.
    const criticizes = noteCriticizes(note, {
      ignoreRelevanceCriticism: key === 'communication_clarity',
    });
    if (score >= 8 && criticizes) {
      reasons.push(`note_contradicts_high_score:${key}`);
    } else if (score < 3 && !criticizes && notePraises(note)) {
      // Off-topic answers have specificity 0 forced by the rubric's hard rule
      // (relevance 0 ⇒ specificity 0) — a note praising the (off-topic)
      // details there is descriptive, not a drift signal.
      if (key === 'specificity' && dimensions.relevance.score === 0) continue;
      reasons.push(`note_contradicts_low_score:${key}`);
    }
  }
  return reasons;
}

// ── Full validation of raw LLM output ─────────────────────────────────────────

/**
 * Validates the parsed LLM JSON against score-v1:
 *   - structural/range check (Zod: 0–10, multiples of 0.5)
 *   - sub_rubric is application-owned (wrong/missing values are overwritten)
 *   - contradiction check → score_suspect (score still returned)
 */
export function validateAnswerScoreOutput(
  parsed: unknown,
  expectedSubRubric: SubRubric,
  opts?: { lowSttConfidence?: boolean },
): AnswerScoreValidation {
  // APPLICATION DECIDES RUBRIC. Strip/overwrite any LLM-chosen sub_rubric so a
  // wrong enum never rejects an otherwise-valid score (or reach the UI).
  const withAuthoritativeRubric =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? { ...(parsed as Record<string, unknown>), sub_rubric: expectedSubRubric }
      : parsed;

  const result = answerScoreLlmSchema.safeParse(withAuthoritativeRubric);
  if (!result.success) {
    const errors = result.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    return { ok: false, errors };
  }

  const returnedSubRubric =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).sub_rubric
      : undefined;
  if (
    typeof returnedSubRubric === 'string' &&
    returnedSubRubric !== expectedSubRubric
  ) {
    console.info(
      JSON.stringify({
        event: 'answer_score_sub_rubric_normalized',
        expected: expectedSubRubric,
        received: returnedSubRubric,
      }),
    );
  }

  const dimensions = result.data.dimensions;

  // Contradiction check runs against the MODEL's own scores (pre-clamp) —
  // it exists to catch model rubric-drift, not our deterministic corrections.
  const suspectReasons = findContradictions(dimensions);

  // Deterministic enforcement of the rubric's hard rule: an entirely off-topic
  // answer (relevance 0) has, by definition, zero on-topic specifics. The
  // prompt states this, but the model violated it in golden-set runs
  // (specificity 5/0/7 with relevance 0/0/0 on the same sample) — so the rule
  // lives in code, not just prose. Pre-clamp value survives in the persisted
  // raw_model_output for audit.
  if (dimensions.relevance.score === 0 && dimensions.specificity.score > 0) {
    dimensions.specificity = {
      score: 0,
      note: `${dimensions.specificity.note} [auto-clamped to 0 because relevance is 0]`.slice(0, 500),
    };
  }

  // STAR structure 0 historically meant "no matching incident" — that is
  // relevance, not organization. Floor only the collapse-to-zero case; do not
  // invent STAR elements or raise a genuinely thin arc.
  if (
    expectedSubRubric === 'star' &&
    dimensions.structure.score === 0 &&
    dimensions.relevance.score > 0
  ) {
    dimensions.structure = {
      score: STAR_STRUCTURE_RELEVANCE_FLOOR,
      note: `${dimensions.structure.note} [auto-floored to ${STAR_STRUCTURE_RELEVANCE_FLOOR}: missing scenario is relevance, not structure]`.slice(
        0,
        500,
      ),
    };
    suspectReasons.push('structure_floored_independent_of_relevance');
  }
  if (opts?.lowSttConfidence) {
    suspectReasons.push('low_stt_confidence');
  }

  return {
    ok: true,
    value: {
      dimensions,
      overall: computeOverall(dimensions),
      one_line_summary: result.data.one_line_summary,
      score_suspect: suspectReasons.length > 0,
      suspect_reasons: suspectReasons,
    },
  };
}
