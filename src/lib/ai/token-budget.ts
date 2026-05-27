/**
 * Per-operation token budgets.
 *
 * Output-token cap for each AI operation. Without max_tokens, OpenRouter
 * defaults to the model's full context window (up to 65 536 for
 * gpt-4o-mini), exhausting OpenRouter credits on every call.
 *
 * The canonical values now live in operation-registry.ts so a single config
 * change propagates to every caller. This module is a back-compat shim that
 * preserves the historic getTokenBudget(operation, provider?) signature.
 */

import {
  getOperationSpec,
  type AiOperation,
  type AiProvider,
} from '@/lib/ai/operation-registry';

export type { AiOperation, AiProvider } from '@/lib/ai/operation-registry';

/** Absolute floor / ceiling applied after provider clamping. */
const MIN_TOKENS = 100;
const MAX_TOKENS = 2_200;

/** Conservative upper bound per provider. Stays well within typical rate-limit windows. */
const PROVIDER_CAPS: Record<AiProvider, number> = {
  openrouter: 2_200,
  openai:     2_200,
  mistral:    2_200,
};

/**
 * Returns the clamped output-token budget for a given operation
 * (and optionally provider). Logs a warning when the raw budget would be
 * clamped — useful for catching registry edits that exceed provider limits.
 */
export function getTokenBudget(operation: AiOperation, provider?: AiProvider): number {
  const raw = getOperationSpec(operation).maxOutputTokens;
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
