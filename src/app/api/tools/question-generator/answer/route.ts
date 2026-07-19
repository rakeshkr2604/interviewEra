/**
 * Question Engine v2 — lazy per-question answer coaching (decision D2).
 * Anonymous free-tool endpoint: rate-limited per IP (30/day), Redis-cached
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
import { QG_CATEGORIES } from '@/lib/question-engine/schemas';

export const maxDuration = 30;

const answerRequestSchema = z.object({
  question: z.string().trim().min(10).max(600),
  category: z.enum(QG_CATEGORIES),
  role: z.string().trim().max(100).optional(),
  level: z.string().trim().max(40).optional(),
});

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  );
}

export async function POST(request: NextRequest) {
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
  const { question, category, role, level } = parsed.data;

  const ip = clientIp(request);
  const limited = await checkAndConsumeFreeToolLimit('question-generator-answer', ip, {
    failClosed: false,
  });
  if (!limited.ok) {
    return NextResponse.json({ error: limited.message }, { status: 429 });
  }

  const cacheKey = buildQgAnswerCacheKey(question, level ?? '');
  const cached = await getCachedQgAnswer(cacheKey);
  if (cached) {
    return NextResponse.json({ answer: cached, cached: true });
  }

  if (!isOpenRouterConfigured()) {
    return NextResponse.json(
      { error: 'AI is not configured. Please try again later.' },
      { status: 503 },
    );
  }

  const result = await generateQgAnswer({ question, category, role, level });
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
  return NextResponse.json({ answer: result.answer, cached: false });
}
