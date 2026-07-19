/**
 * Question Engine v2 — LLM calls with zod validation + single retry.
 *
 * Retry pattern copied from src/lib/ats/jd-requirements.ts: two attempts,
 * the second attempt's user message carries the first attempt's validation
 * issues. Transport failures (network/quota/timeout) are NOT retried here —
 * chat-completion-core already retries those; they surface as 'llm_error'.
 * Double validation failure surfaces as 'invalid_output' and callers must
 * return the friendly error, never partial data (per spec).
 */

import { completeInterviewChat } from '@/lib/ai/interview-completion';
import { parseJsonObject } from '@/lib/ai/response-contract';
import {
  getOperationSpec,
  getOperationTimeoutMs,
} from '@/lib/ai/operation-registry';
import {
  QG_ANSWER_SYSTEM_V2,
  QG_SYSTEM_V2,
  buildQgAnswerUserMessage,
  buildQgSetUserMessage,
  buildValidationRetrySuffix,
  type QgAnswerRequest,
  type QgSetRequest,
} from './prompts';
import { qgAnswerSchema, qgSetSchema, type QgAnswer, type QgQuestion } from './schemas';
import { validateCategoryDistribution } from './validate';
import type { ZodError } from 'zod';

export type QgGenerateFailure = { ok: false; reason: 'llm_error' | 'invalid_output' };
export type QgSetResult = { ok: true; questions: QgQuestion[] } | QgGenerateFailure;
export type QgAnswerResult = { ok: true; answer: QgAnswer } | QgGenerateFailure;

function summarizeZodIssues(error: ZodError): string {
  return error.issues
    .slice(0, 8)
    .map((i) => `${i.path.join('.')}: ${i.message}`)
    .join('; ');
}

async function completeQg(
  operation: 'qg_set_generation' | 'qg_answer_generation',
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const spec = getOperationSpec(operation);
  const { content } = await completeInterviewChat({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: spec.temperature,
    maxTokens: spec.maxOutputTokens,
    operation,
    jsonMode: true,
    signal: AbortSignal.timeout(getOperationTimeoutMs(operation)),
  });
  return content;
}

export async function generateQgSet(request: QgSetRequest): Promise<QgSetResult> {
  const baseMessage = buildQgSetUserMessage(request);
  let lastIssues = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const userMessage =
      attempt === 0 ? baseMessage : baseMessage + buildValidationRetrySuffix(lastIssues);

    let content: string;
    try {
      content = await completeQg('qg_set_generation', QG_SYSTEM_V2, userMessage);
    } catch (err) {
      console.warn('[question-engine] set generation LLM call failed:', err);
      return { ok: false, reason: 'llm_error' };
    }

    const parsed = parseJsonObject(content);
    if (!parsed.ok) {
      lastIssues = 'Response was not valid JSON.';
      continue;
    }

    const result = qgSetSchema.safeParse(parsed.value);
    if (!result.success) {
      lastIssues = summarizeZodIssues(result.error);
      continue;
    }

    const distribution = validateCategoryDistribution(result.data.questions);
    if (!distribution.ok) {
      lastIssues = distribution.message;
      continue;
    }

    const questions = [...result.data.questions].sort((a, b) => a.order - b.order);
    return { ok: true, questions };
  }

  console.warn('[question-engine] set validation failed twice:', lastIssues);
  return { ok: false, reason: 'invalid_output' };
}

export async function generateQgAnswer(request: QgAnswerRequest): Promise<QgAnswerResult> {
  const baseMessage = buildQgAnswerUserMessage(request);
  let lastIssues = '';

  for (let attempt = 0; attempt < 2; attempt++) {
    const userMessage =
      attempt === 0 ? baseMessage : baseMessage + buildValidationRetrySuffix(lastIssues);

    let content: string;
    try {
      content = await completeQg('qg_answer_generation', QG_ANSWER_SYSTEM_V2, userMessage);
    } catch (err) {
      console.warn('[question-engine] answer generation LLM call failed:', err);
      return { ok: false, reason: 'llm_error' };
    }

    const parsed = parseJsonObject(content);
    if (!parsed.ok) {
      lastIssues = 'Response was not valid JSON.';
      continue;
    }

    const result = qgAnswerSchema.safeParse(parsed.value);
    if (!result.success) {
      lastIssues = summarizeZodIssues(result.error);
      continue;
    }

    return { ok: true, answer: result.data };
  }

  console.warn('[question-engine] answer validation failed twice:', lastIssues);
  return { ok: false, reason: 'invalid_output' };
}
