/**
 * Inference router — operation-aware OpenRouter completions with a hard outer deadline.
 *
 * No Mistral / direct OpenAI — matches platform-wide OpenRouter-only policy.
 */

import type OpenAI from 'openai';
import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { withOperationDeadline } from '@/lib/ai/timeout-policy';
import {
  getOperationSpec,
  type AiOperation,
} from '@/lib/ai/operation-registry';

export type RoutedProvider = 'openrouter';

export interface RouteInferenceOptions {
  operation: AiOperation;
  messages: OpenAI.Chat.ChatCompletionMessageParam[];
  temperatureOverride?: number;
  maxTokensOverride?: number;
}

export interface RoutedCompletion {
  content: string;
  provider: RoutedProvider;
  latencyMs: number;
}

export async function routeInference(
  options: RouteInferenceOptions,
): Promise<RoutedCompletion> {
  const spec = getOperationSpec(options.operation);
  const temperature = options.temperatureOverride ?? spec.temperature;
  const maxTokens     = options.maxTokensOverride   ?? spec.maxOutputTokens;
  const wantJson      = spec.responseFormat === 'json';

  return withOperationDeadline(options.operation, async (signal) => {
    const started = Date.now();
    const { content } = await completeInterviewChat({
      messages:    options.messages,
      temperature,
      maxTokens,
      operation:   options.operation,
      jsonMode:    wantJson,
      signal,
    });
    return { content, provider: 'openrouter', latencyMs: Date.now() - started };
  });
}
