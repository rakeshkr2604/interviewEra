/**
 * Core interview flows (evaluate / questions / resume): OpenRouter first when configured,
 * then direct OpenAI + shared quota/circuit breaker, then callers may fall back to Mistral.
 *
 * Per-model circuit breaker (provider-health.ts) ensures a consistently failing model
 * (400/403/timeouts) is skipped for CIRCUIT_RESET_MS instead of retried every request.
 */

import OpenAI from 'openai';
import openai, { callWithRetry } from '@/lib/openai/client';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { completionWithRetries, modelPrefersPlainJson } from '@/lib/ai/chat-completion-core';
import {
  isModelHealthy,
  recordModelSuccess,
  recordModelFailure,
} from '@/lib/ai/provider-health';
import { recordProviderOutcome } from '@/lib/ai/provider-intelligence';
import {
  createRequestBudget,
  canAttemptProvider,
  recordBudgetAttempt,
  budgetSnapshot,
} from '@/lib/ai/request-budget-engine';
import { isSingleProviderMode } from '@/lib/ai/single-provider-mode';

export type InterviewAiChatProvider = 'openrouter' | 'openai';

const OPENROUTER_INTERVIEW_MODELS: string[] = [
  ...new Set(
    [
      process.env.OPENROUTER_INTERVIEW_MODEL?.trim(),
      process.env.OPENROUTER_MODEL?.trim(),
      'openai/gpt-4o-mini',
      'openai/gpt-4.1-mini',
    ].filter((m): m is string => Boolean(m)),
  ),
];

const OPENAI_INTERVIEW_MODELS: string[] = [
  ...new Set(
    [
      process.env.OPENAI_INTERVIEW_MODEL?.trim(),
      'gpt-4.1-mini',
      'gpt-4o-mini',
    ].filter((m): m is string => Boolean(m)),
  ),
];

/** Key used in the health tracker for a specific OpenRouter model. */
function orKey(model: string): string { return `openrouter:${model}`; }
/** Key used in the health tracker for a direct OpenAI model. */
function oaiKey(model: string): string { return `openai:${model}`; }

export async function completeInterviewChat(options: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
  maxTokens?: number;
  /** Operation name for intelligence tracking and telemetry. */
  operation?: string;
  /**
   * Request structured JSON output. Default true (matches historical behavior).
   * Set false for plain-text callers like followup-generator — OpenAI returns 400
   * for json_object mode when no message contains the literal word "json".
   */
  jsonMode?: boolean;
}): Promise<{ content: string; provider: InterviewAiChatProvider }> {
  const orClient = createOpenRouterClient();

  const op = options.operation ?? 'unknown';
  const budget = createRequestBudget(op);
  const wantJson = options.jsonMode ?? true;

  // ── OpenRouter: try each model, skip unhealthy ones ───────────────────────
  const orBudget = canAttemptProvider(budget, 'openrouter');
  if (orClient && OPENROUTER_INTERVIEW_MODELS.length > 0 && orBudget.allowed) {
    recordBudgetAttempt(budget, 'openrouter');
    for (const model of OPENROUTER_INTERVIEW_MODELS) {
      const key = orKey(model);
      if (!isModelHealthy(key)) {
        console.info(`[interview-ai] Skipping unhealthy OpenRouter model "${model}"`);
        continue;
      }

      const jsonMode = wantJson && !modelPrefersPlainJson(model);
      const t0 = Date.now();
      try {
        const content = await completionWithRetries(
          orClient, model, options.messages, options.temperature, jsonMode, options.maxTokens,
        );
        recordModelSuccess(key);
        recordProviderOutcome({ provider: 'openrouter', operation: op, latencyMs: Date.now() - t0, success: true, timeout: false, quotaExhausted: false, jsonValid: true });
        return { content, provider: 'openrouter' };
      } catch (e) {
        const statusCode = e instanceof OpenAI.APIError ? e.status ?? undefined : undefined;
        const isTimeout  = e instanceof Error && (e.name === 'AbortError' || e.message.includes('timeout'));
        const isQuota    = (e instanceof OpenAI.APIError && e.code === 'insufficient_quota') || statusCode === 402;
        recordModelFailure(key, statusCode);
        recordProviderOutcome({ provider: 'openrouter', operation: op, latencyMs: Date.now() - t0, success: false, timeout: isTimeout, quotaExhausted: isQuota, jsonValid: true });
        console.warn(
          `[interview-ai] OpenRouter "${model}" failed (HTTP ${statusCode ?? '?'}):`,
          e instanceof Error ? e.message : e,
        );
      }

      // If the model failed in json_object mode, try once more in plain mode
      // (some OpenRouter models reject the response_format header).
      if (jsonMode) {
        if (!isModelHealthy(key)) continue; // already tripped by above failure
        const t1 = Date.now();
        try {
          const content = await completionWithRetries(
            orClient, model, options.messages, options.temperature, false, options.maxTokens,
          );
          recordModelSuccess(key);
          recordProviderOutcome({ provider: 'openrouter', operation: op, latencyMs: Date.now() - t1, success: true, timeout: false, quotaExhausted: false, jsonValid: true });
          return { content, provider: 'openrouter' };
        } catch (e) {
          const statusCode = e instanceof OpenAI.APIError ? e.status ?? undefined : undefined;
          const isTimeout  = e instanceof Error && (e.name === 'AbortError' || e.message.includes('timeout'));
          const isQuota    = (e instanceof OpenAI.APIError && e.code === 'insufficient_quota') || statusCode === 402;
          recordModelFailure(key, statusCode);
          recordProviderOutcome({ provider: 'openrouter', operation: op, latencyMs: Date.now() - t1, success: false, timeout: isTimeout, quotaExhausted: isQuota, jsonValid: true });
          console.warn(
            `[interview-ai] OpenRouter "${model}" (plain) failed:`,
            e instanceof Error ? e.message : e,
          );
        }
      }
    }
    console.warn('[interview-ai] All OpenRouter models failed; falling back to direct OpenAI');
  } else if (!orBudget.allowed) {
    console.warn(`[interview-ai] Budget denied OpenRouter: ${orBudget.reason}`);
  }

  // ── Direct OpenAI: try each model, respect shared quota circuit ───────────
  if (isSingleProviderMode()) {
    console.warn('[interview-ai] SINGLE_PROVIDER_MODE: skipping OpenAI fallback');
    throw new Error('OpenRouter unavailable and OpenAI fallback disabled in single-provider mode');
  }
  let lastError: unknown;
  const oaiBudget = canAttemptProvider(budget, 'openai');
  if (!oaiBudget.allowed) {
    console.warn(
      `[interview-ai] Budget denied OpenAI: ${oaiBudget.reason} — snapshot: ${JSON.stringify(budgetSnapshot(budget))}`,
    );
    throw lastError instanceof Error ? lastError : new Error('Interview AI completion failed: budget exhausted');
  }
  recordBudgetAttempt(budget, 'openai');
  for (const model of OPENAI_INTERVIEW_MODELS) {
    const key = oaiKey(model);
    if (!isModelHealthy(key)) {
      console.info(`[interview-ai] Skipping unhealthy OpenAI model "${model}"`);
      continue;
    }

    const t2 = Date.now();
    try {
      const response = await callWithRetry(() =>
        openai.chat.completions.create({
          model,
          messages: options.messages,
          temperature: options.temperature,
          ...(options.maxTokens != null ? { max_tokens: options.maxTokens } : {}),
        }),
      );
      const content = response.choices[0]?.message?.content;
      if (!content?.trim()) throw new Error('Empty response from OpenAI');
      recordModelSuccess(key);
      recordProviderOutcome({ provider: 'openai', operation: op, latencyMs: Date.now() - t2, success: true, timeout: false, quotaExhausted: false, jsonValid: true });
      return { content, provider: 'openai' };
    } catch (e) {
      lastError = e;
      const statusCode = e instanceof OpenAI.APIError ? e.status ?? undefined : undefined;
      const isTimeout  = e instanceof Error && (e.name === 'AbortError' || e.message.includes('timeout'));
      const isQuota    = (e instanceof OpenAI.APIError && e.code === 'insufficient_quota') || statusCode === 402;
      recordModelFailure(key, statusCode);
      recordProviderOutcome({ provider: 'openai', operation: op, latencyMs: Date.now() - t2, success: false, timeout: isTimeout, quotaExhausted: isQuota, jsonValid: true });
      console.warn(
        `[interview-ai] OpenAI "${model}" failed (HTTP ${statusCode ?? '?'}):`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Interview AI completion failed');
}
