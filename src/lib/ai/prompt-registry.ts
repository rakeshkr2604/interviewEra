/**
 * Prompt registry foundation.
 *
 * This module provides COMPOSABLE building blocks for system prompts so the
 * same culturally-tuned instructions don't get re-typed (and drift) in five
 * different files. It is intentionally minimal — operations may still own
 * their detailed instruction body inline. The goal here is:
 *
 *   1. Shared headers (Hinglish tone, JSON-only mode, India context) live in
 *      ONE place so a wording change propagates everywhere.
 *   2. Each shared header carries a `version` literal so future telemetry can
 *      attribute regressions to a specific header revision.
 *   3. composePrompt() concatenates headers + body with consistent spacing
 *      and no duplicate blocks (the same header appearing twice is dropped).
 *
 * We deliberately do NOT introduce template engines, variable interpolation
 * frameworks, or YAML loaders. A plain Record-of-strings is enough.
 */

// ── Shared headers ────────────────────────────────────────────────────────────

export interface PromptFragment {
  /** Stable identifier for this fragment — used for dedup + telemetry. */
  id: string;
  /** Version bump this whenever the wording materially changes. */
  version: number;
  /** The literal text that gets concatenated into the prompt. */
  text: string;
}

/**
 * Cultural-context note. Indian campus candidates frequently code-switch
 * (Hinglish). Without this header the model penalises clarity unfairly.
 * Mirror this rule into any new operation that scores or critiques speech.
 */
export const HINGLISH_TONE_NOTE: PromptFragment = {
  id:      'india.hinglish_tone',
  version: 1,
  text:
    'Cultural context: this is an Indian campus-placement candidate. ' +
    'Hinglish (English–Hindi code-switching) is normal and must NOT lower ' +
    'communication scores unless it genuinely impairs comprehension.',
};

/**
 * Strict JSON-only output header. Pair this with `responseFormat: 'json'`
 * in the operation registry — together they make malformed output rare.
 */
export const JSON_ONLY_HEADER: PromptFragment = {
  id:      'format.json_only',
  version: 1,
  text:
    'CRITICAL: Respond with ONLY valid JSON. No markdown fences, no preamble, ' +
    'no trailing text. Start with { and end with }.',
};

/**
 * No-rubric-leak guard for evaluation prompts. Prevents the model from
 * surfacing internal scoring formulas in user-facing feedback text.
 */
export const NO_RUBRIC_LEAK_HEADER: PromptFragment = {
  id:      'evaluation.no_rubric_leak',
  version: 1,
  text:
    'Do NOT reveal scoring formulas, rubric weights, dimension percentages, ' +
    'or how numeric scores are combined — surface only candidate-facing reasoning.',
};

/**
 * Specificity rule shared by evaluation + follow-up prompts. Without this
 * the model defaults to "lacks clarity / be more specific" filler.
 */
export const SPECIFICITY_RULE: PromptFragment = {
  id:      'feedback.specificity_rule',
  version: 2,
  text:
    'Be SPECIFIC to what THIS candidate said. Quote or paraphrase their actual ' +
    'words. NEVER use generic filler ("lacks clarity", "needs more structure", ' +
    '"be more specific", "improve communication", "be more confident") on its own — ' +
    'always cite a concrete example and show what a stronger version looks like.',
};

/**
 * Actionable feedback rule — pairs with SPECIFICITY_RULE. Prevents the model
 * from naming gaps without showing what better looks like.
 */
export const ACTIONABLE_FEEDBACK_RULE: PromptFragment = {
  id:      'feedback.actionable_rule',
  version: 1,
  text:
    'Be ACTIONABLE: for every weakness named, show a concrete example of a ' +
    'stronger phrasing or approach specific to this question. Do not label gaps ' +
    'without demonstrating what better looks like.',
};

/**
 * Anti-generic-filler rule for follow-up questions. Prevents the model from
 * asking boilerplate probes that could apply to any answer.
 */
export const ANTI_GENERIC_FOLLOWUP: PromptFragment = {
  id:      'followup.anti_generic',
  version: 1,
  text:
    'BANNED follow-up phrases (too generic): "Can you quantify that?", ' +
    '"Tell me more about your approach.", "What technologies did you use?", ' +
    '"Could you elaborate on that?", "Can you give an example?". ' +
    'Every follow-up must reference something the candidate actually said.',
};

/**
 * Model answer format rule. Ensures model_answer_hint is structured and
 * revision-friendly rather than a vague one-liner.
 */
export const MODEL_ANSWER_FORMAT: PromptFragment = {
  id:      'output.model_answer_format',
  version: 1,
  text:
    'model_answer_hint must be 3–4 bullet points (• character) covering: ' +
    '(1) core method or structure expected, (2) evidence or metric a strong answer cites, ' +
    '(3) ownership language expected, (4) one example of strong phrasing for this question. ' +
    'Never leave it as a generic restatement of the question.',
};

// ── Composer ──────────────────────────────────────────────────────────────────

/**
 * Compose a system prompt from a list of shared fragments + an operation-
 * specific body. Duplicate fragments (same id) are dropped automatically so
 * a caller can safely include both a "header" and a "fragment" referencing
 * the same rule without doubling tokens.
 */
export function composePrompt(opts: {
  fragments?: readonly PromptFragment[];
  body: string;
}): string {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const f of opts.fragments ?? []) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    parts.push(f.text);
  }
  parts.push(opts.body.trim());

  return parts.join('\n\n');
}

/**
 * Return the version identifier for a prompt — useful for telemetry tagging
 * so an output-quality regression can be traced to a specific header bump.
 */
export function fragmentRef(fragment: PromptFragment): string {
  return `${fragment.id}@v${fragment.version}`;
}
