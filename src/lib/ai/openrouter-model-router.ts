/**
 * Central OpenRouter model policy — SINGLE source of truth for model selection.
 *
 * Business rule (2026 MVP):
 *   - Cheap/fast: openai/gpt-4.1-mini — parsing, summaries, tooling, analyzer agent.
 *   - Higher quality: openai/gpt-4.1 — live interview paths (questions, follow-ups, scoring).
 *
 * Overrides: OPENROUTER_SMART_MODEL, OPENROUTER_CHEAP_MODEL (optional, ops-only).
 */

import type { AiOperation } from '@/lib/ai/operation-registry';

export const OPENROUTER_CHEAP_MODEL = 'openai/gpt-4.1-mini' as const;
export const OPENROUTER_SMART_MODEL = 'openai/gpt-4.1' as const;

const SMART_OPERATIONS = new Set<AiOperation>([
  'answer_evaluation',
  'followup_generation',
]);

/** Fast JSON generation — quality comes from resume/JD context, not a heavy model. */
const FAST_GENERATION_OPERATIONS = new Set<AiOperation>(['question_generation']);

const DEFAULT_QUESTION_GEN_MODEL = 'google/gemini-2.5-flash';

/**
 * Resolve OpenRouter model id from an operation name emitted by callers.
 */
export function getOpenRouterModelForOperation(operation: string | undefined): string {
  const envSmart = process.env.OPENROUTER_SMART_MODEL?.trim();
  const envCheap = process.env.OPENROUTER_CHEAP_MODEL?.trim();

  if (!operation || operation === 'unknown') {
    return envCheap ?? OPENROUTER_CHEAP_MODEL;
  }

  const op = operation as AiOperation;

  if (FAST_GENERATION_OPERATIONS.has(op)) {
    return (
      process.env.OPENROUTER_QUESTION_GEN_MODEL?.trim() ??
      envCheap ??
      DEFAULT_QUESTION_GEN_MODEL
    );
  }

  if (SMART_OPERATIONS.has(op)) {
    return envSmart ?? OPENROUTER_SMART_MODEL;
  }
  return envCheap ?? OPENROUTER_CHEAP_MODEL;
}
