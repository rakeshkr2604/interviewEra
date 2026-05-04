/**
 * Core interview flows (evaluate / questions / resume): OpenRouter first when configured,
 * then direct OpenAI + shared quota/circuit breaker, then callers may fall back to Mistral.
 */

import OpenAI from 'openai';
import openai, { callWithRetry } from '@/lib/openai/client';
import { createOpenRouterClient } from '@/lib/openrouter/client';
import { completionWithRetries, modelPrefersPlainJson } from '@/lib/ai/chat-completion-core';

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

export async function completeInterviewChat(options: {
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperature: number;
}): Promise<{ content: string; provider: InterviewAiChatProvider }> {
  const orClient = createOpenRouterClient();

  if (orClient && OPENROUTER_INTERVIEW_MODELS.length > 0) {
    for (const model of OPENROUTER_INTERVIEW_MODELS) {
      const jsonMode = !modelPrefersPlainJson(model);
      try {
        const content = await completionWithRetries(
          orClient,
          model,
          options.messages,
          options.temperature,
          jsonMode,
        );
        return { content, provider: 'openrouter' };
      } catch (e) {
        console.warn(
          `[interview-ai] OpenRouter model "${model}" failed:`,
          e instanceof Error ? e.message : e,
        );
      }
      if (jsonMode) {
        try {
          const content = await completionWithRetries(
            orClient,
            model,
            options.messages,
            options.temperature,
            false,
          );
          return { content, provider: 'openrouter' };
        } catch (e) {
          console.warn(
            `[interview-ai] OpenRouter model "${model}" (no json_mode) failed:`,
            e instanceof Error ? e.message : e,
          );
        }
      }
    }
    console.warn('[interview-ai] All OpenRouter models failed; falling back to direct OpenAI');
  }

  let lastError: unknown;
  for (const model of OPENAI_INTERVIEW_MODELS) {
    try {
      const response = await callWithRetry(() =>
        openai.chat.completions.create({
          model,
          messages: options.messages,
          temperature: options.temperature,
        }),
      );
      const content = response.choices[0]?.message?.content;
      if (!content?.trim()) throw new Error('Empty response from OpenAI');
      return { content, provider: 'openai' };
    } catch (e) {
      lastError = e;
      console.warn(
        `[interview-ai] OpenAI model "${model}" failed:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Interview AI completion failed');
}
