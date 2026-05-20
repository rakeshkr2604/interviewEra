/**
 * Per-operation token budgets.
 *
 * Without max_tokens, OpenRouter defaults to the model's full context window
 * (up to 65 536 for gpt-4o-mini), exhausting OpenRouter credits on every call.
 * Set these budgets conservatively — they cap OUTPUT tokens, not total context.
 */

export type AiOperation =
  | 'followup_generation'
  | 'agent_analysis'
  | 'answer_evaluation'
  | 'question_generation'
  | 'resume_parse'
  | 'report_generation'
  | 'jd_parse'
  | 'jd_validate'
  | 'document_classify'
  | 'free_tool';

export type AiProvider = 'openrouter' | 'openai' | 'mistral';

const TOKEN_BUDGETS: Record<AiOperation, number> = {
  followup_generation:  900,
  agent_analysis:       600,
  answer_evaluation:   1800,
  question_generation: 1200,
  resume_parse:         800,
  report_generation:   2200,
  jd_parse:             800,
  jd_validate:          400,
  document_classify:    200,
  free_tool:           1200,
};

/** Absolute floor / ceiling applied after provider clamping. */
const MIN_TOKENS = 100;
const MAX_TOKENS = 2200;

/** Conservative upper bound per provider. Stays well within typical rate-limit windows. */
const PROVIDER_CAPS: Record<AiProvider, number> = {
  openrouter: 2200,
  openai:     2200,
  mistral:    2200,
};

/**
 * Returns the clamped token budget for a given operation (and optionally provider).
 * Logs a warning when the raw budget would be clamped.
 */
export function getTokenBudget(operation: AiOperation, provider?: AiProvider): number {
  const raw = TOKEN_BUDGETS[operation];
  const providerCap = provider ? PROVIDER_CAPS[provider] : MAX_TOKENS;
  const clamped = Math.max(MIN_TOKENS, Math.min(providerCap, raw));
  if (raw !== clamped) {
    console.warn(
      `[token-budget] "${operation}" raw budget ${raw} clamped to ${clamped}` +
      (provider ? ` (provider cap: ${provider}/${providerCap})` : ''),
    );
  }
  return clamped;
}
