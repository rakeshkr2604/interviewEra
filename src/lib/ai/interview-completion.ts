/**
 * Interview AI completions — OpenRouter ONLY (no direct OpenAI SDK, no Mistral here).
 *
 * Model + per-attempt timeouts come from `openrouter-model-router` + operation-registry.
 * Circuit breaker keys are namespaced `openrouter:<model>`.
 */

import OpenAI from 'openai';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import {
  completionWithRetries,
  modelPrefersPlainJson,
  DEFAULT_ATTEMPT_TIMEOUT_MS,
} from '@/lib/ai/chat-completion-core';
import {
  recordModelSuccess,
  recordModelFailure,
} from '@/lib/ai/provider-health';
import { recordProviderOutcome } from '@/lib/ai/provider-intelligence';
import {
  createRequestBudget,
  canAttemptProvider,
  recordBudgetAttempt,
} from '@/lib/ai/request-budget-engine';
import { getOpenRouterModelForOperation } from '@/lib/ai/openrouter-model-router';
import {
  getLlmAttemptTimeoutMs,
  listOperations,
  type AiOperation,
} from '@/lib/ai/operation-registry';
import { logInterviewAiCompletion } from '@/lib/telemetry/structured-ai-log';

export type InterviewAiChatProvider = 'openrouter';

function orKey(model: string): string {
  return `openrouter:${model}`;
}

function resolveRegistryOperation(name: string | undefined): AiOperation {
  if (!name) return 'free_tool';
  const known = listOperations() as readonly string[];
  if ((known as string[]).includes(name)) return name as AiOperation;
  return 'free_tool';
}

export async function completeInterviewChat(options: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
  maxTokens?: number;
  operation?: string;
  jsonMode?: boolean;
  signal?: AbortSignal;
}): Promise<{ content: string; provider: InterviewAiChatProvider }> {
  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('[interview-ai] OpenRouter is not configured (OPENROUTER_API_KEY missing)');
  }

  const opName = options.operation ?? 'unknown';
  const registryOp = resolveRegistryOperation(opName === 'unknown' ? undefined : opName);

  const model = getOpenRouterModelForOperation(opName === 'unknown' ? undefined : opName);
  const attemptTimeoutMs =
    getLlmAttemptTimeoutMs(registryOp) ?? DEFAULT_ATTEMPT_TIMEOUT_MS;
  const wantJson = options.jsonMode ?? true;
  const { signal } = options;

  const budget = createRequestBudget(opName);
  const orBudget = canAttemptProvider(budget, 'openrouter');
  if (!orBudget.allowed) {
    console.warn(`[interview-ai] Budget denied OpenRouter: ${orBudget.reason}`);
    throw new Error('Interview AI completion failed: budget exhausted');
  }
  recordBudgetAttempt(budget, 'openrouter');

  const key = orKey(model);

  const jsonMode = wantJson && !modelPrefersPlainJson(model);
  const t0 = Date.now();

  const run = async (useJson: boolean): Promise<string> => {
    const { content } = await completionWithRetries(
      client,
      model,
      options.messages,
      options.temperature,
      useJson,
      options.maxTokens,
      signal,
      attemptTimeoutMs,
    );
    return content;
  };

  try {
    const content = await run(jsonMode);
    recordModelSuccess(key);
    recordProviderOutcome({
      provider:      'openrouter',
      operation:     opName,
      latencyMs:     Date.now() - t0,
      success:       true,
      timeout:       false,
      quotaExhausted: false,
      jsonValid:     true,
    });
    logInterviewAiCompletion({
      event:         'openrouter_completion',
      operation:     opName,
      model,
      provider:      'openrouter',
      latency_ms:    Date.now() - t0,
      success:       true,
    });
    return { content, provider: 'openrouter' };
  } catch (e) {
    if (signal?.aborted) throw e;
    const statusCode = e instanceof OpenAI.APIError ? e.status ?? undefined : undefined;
    const isTimeout =
      e instanceof Error && (e.name === 'AbortError' || e.message.includes('timeout'));
    const isQuota =
      (e instanceof OpenAI.APIError && e.code === 'insufficient_quota') || statusCode === 402;
    recordModelFailure(key, statusCode);
    recordProviderOutcome({
      provider:       'openrouter',
      operation:      opName,
      latencyMs:      Date.now() - t0,
      success:        false,
      timeout:        isTimeout,
      quotaExhausted: isQuota,
      jsonValid:      true,
    });
    logInterviewAiCompletion({
      event:         'openrouter_completion',
      operation:     opName,
      model,
      provider:      'openrouter',
      latency_ms:    Date.now() - t0,
      success:       false,
      timeout:       isTimeout,
      http_status:   statusCode,
    });

    // json_object rejected by some routers — one plain-text attempt (same model, same deadline)
    if (jsonMode) {
      if (signal?.aborted) throw e;
      const t1 = Date.now();
      try {
        const content = await run(false);
        recordModelSuccess(key);
        recordProviderOutcome({
          provider:       'openrouter',
          operation:      opName,
          latencyMs:      Date.now() - t1,
          success:        true,
          timeout:        false,
          quotaExhausted: false,
          jsonValid:      true,
        });
        logInterviewAiCompletion({
          event:        'openrouter_completion',
          operation:    opName,
          model,
          provider:     'openrouter',
          latency_ms:   Date.now() - t1,
          success:      true,
        });
        return { content, provider: 'openrouter' };
      } catch (e2) {
        if (signal?.aborted) throw e2;
        const sc = e2 instanceof OpenAI.APIError ? e2.status ?? undefined : undefined;
        const timeout2 =
          e2 instanceof Error && (e2.name === 'AbortError' || e2.message.includes('timeout'));
        recordModelFailure(key, sc);
        recordProviderOutcome({
          provider:       'openrouter',
          operation:      opName,
          latencyMs:      Date.now() - t1,
          success:        false,
          timeout:        timeout2,
          quotaExhausted: false,
          jsonValid:      true,
        });
        console.warn(`[interview-ai] OpenRouter "${model}" (plain) failed:`, e2);
      }
    }

    console.warn(
      `[interview-ai] OpenRouter "${model}" failed (HTTP ${statusCode ?? '?'})`,
      e instanceof Error ? e.message : e,
    );
    throw e instanceof Error ? e : new Error('Interview AI completion failed');
  }
}
