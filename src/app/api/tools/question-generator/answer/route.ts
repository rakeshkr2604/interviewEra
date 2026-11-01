/**
 * Question Engine v2 — lazy per-question answer coaching (decision D2).
 * Verified-account free-tool endpoint: per-user fair-use limits + IP abuse ceiling, Redis-cached
 * on hash(question, level) for 30 days, zod-validated with a single retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isOpenRouterConfigured } from '@/lib/openrouter/client';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import { generateQgAnswer } from '@/lib/question-engine/generate';
import {
  buildQgAnswerCacheKey,
  getCachedQgAnswer,
  setCachedQgAnswer,
} from '@/lib/question-engine/cache';
import { QG_CATEGORIES, QG_TOPIC_MAX_CHARS } from '@/lib/question-engine/schemas';
import { logToolUsage } from '@/lib/telemetry/tool-usage-logger';
import { clientIpFromHeaders, requireFreeToolUser } from '@/lib/security/free-tool-access';

export const maxDuration = 30;

const answerRequestSchema = z.object({
  question: z.string().trim().min(10).max(600),
  category: z.enum(QG_CATEGORIES),
  role: z.string().trim().max(100).optional(),
  level: z.string().trim().max(40).optional(),
  topic: z.string().trim().max(QG_TOPIC_MAX_CHARS).optional(),
});

export async function POST(request: NextRequest) {
  const access = await requireFreeToolUser();
  if (!access.ok) {
    return NextResponse.json(
      { error: access.message, code: access.code },
      { status: access.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = answerRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const { question, category, role, level, topic } = parsed.data;

  const ip = clientIpFromHeaders(request.headers);
  const signedIn = true;
  const limited = await checkAndConsumeFreeToolLimit(
    'question-generator-answer',
    { userId: access.userId, ip, tier: access.tier },
    { failClosed: true },
  );
  if (!limited.ok) {
    logToolUsage({ tool: 'question_generator', mode: 'answer', event: 'rate_limited', signed_in: signedIn });
    return NextResponse.json(
      { error: limited.message, code: limited.code, retryAfterSeconds: limited.retryAfterSeconds },
      {
        status: limited.code === 'RATE_LIMIT_UNAVAILABLE' ? 503 : 429,
        headers: { 'Retry-After': String(limited.retryAfterSeconds) },
      },
    );
  }

  const cacheKey = buildQgAnswerCacheKey(question, level ?? '', topic ?? '');
  const cached = await getCachedQgAnswer(cacheKey);
  if (cached) {
    logToolUsage({ tool: 'question_generator', mode: 'answer', event: 'cache_hit', signed_in: signedIn });
    return NextResponse.json({ answer: cached, cached: true });
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'AI is not configured. Please try again later.' },
      { status: 503 },
    );
  }

  const result = await generateQgAnswer({ question, category, role, level, topic });
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === 'invalid_output'
            ? 'The AI returned an unexpected format. Please try again in a moment.'
            : 'Answer coaching is temporarily unavailable. Please try again in a moment.',
      },
      { status: 502 },
    );
  }

  await setCachedQgAnswer(cacheKey, result.answer);
  // cost_usd is null here — per-call cost lands in ai_call_logs (qg_answer_generation).
  logToolUsage({ tool: 'question_generator', mode: 'answer', event: 'run', signed_in: signedIn });
  return NextResponse.json({ answer: result.answer, cached: false });
}
