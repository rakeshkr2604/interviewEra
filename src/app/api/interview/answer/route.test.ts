import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

/**
 * Route-level tests for POST /api/interview/answer, focused on FM-5:
 *   - a Redis outage (rate limiter failClosed) no longer 503s — the answer is
 *     saved with evaluation_status='pending_backfill' and NO evaluation runs
 *   - a genuine over-limit result still 429s
 *   - the healthy path is unchanged (evaluation runs inline)
 *   - if migration 053 is absent, the degraded path fails closed (503) rather
 *     than saving an unmarked answer that would be silently neutral-scored
 */

const USER = { id: 'user-1', email: 'u@example.com' };

let db: FakeDb;
let dbError: ((table: string, mode: string) => { message: string } | null) | undefined;
let checkRateLimitMock: ReturnType<typeof vi.fn>;
let evaluateAnswerMock: ReturnType<typeof vi.fn>;

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
  }),
  createServiceClient: () => makeFakeServiceClient(db, dbError),
}));

vi.mock('@/lib/redis/rate-limit', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/redis/rate-limit')>();
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  };
});

vi.mock('@/lib/openai/evaluate-answer', () => ({
  evaluateAnswer: (...args: unknown[]) => evaluateAnswerMock(...args),
}));

vi.mock('@/lib/ai/llm-cost-guard', () => ({
  estimateLLMCallCostUSD: () => 0.01,
  checkLLMCostGuard: vi.fn(async () => ({ allowed: true })),
  recordLLMSpend: vi.fn(async () => undefined),
}));

vi.mock('@/lib/analytics/interview-events', () => ({
  trackInterviewEvent: vi.fn(),
}));

import { POST } from '@/app/api/interview/answer/route';

const IV = '11111111-1111-4111-8111-111111111111';
const Q1 = '22222222-2222-4222-8222-222222222222';

const validDims = {
  communication_clarity: 7,
  technical_depth: 7,
  answer_structure: 7,
  confidence: 7,
  relevance: 7,
};

function req(body: unknown): Request {
  return new Request('http://localhost/api/interview/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  interviewId: IV,
  questionId: Q1,
  answerText: 'I would use a hash map to deduplicate in linear time.',
  answerMode: 'voice',
  durationSeconds: 30,
};

const healthyLimit = { allowed: true, remaining: 4, resetInSeconds: 10 };
const overLimit = { allowed: false, remaining: 0, resetInSeconds: 10 };
const redisDown = { allowed: false, remaining: 0, resetInSeconds: 10, redisUnavailable: true };

beforeEach(() => {
  dbError = undefined;
  checkRateLimitMock = vi.fn(async () => healthyLimit);
  evaluateAnswerMock = vi.fn(async () => ({
    overall_score: 7,
    dimension_scores: validDims,
    feedback_text: 'Solid answer.',
    detailed_analysis: { strengths: [], improvements: [], model_answer_hint: '', keywords_missing: [] },
    provider: 'openrouter',
  }));
  db = {
    interviews: [{ id: IV, user_id: USER.id, status: 'in_progress' }],
    questions: [
      { id: Q1, interview_id: IV, question_text: 'How do you deduplicate a list?', rubric: {} },
    ],
    answers: [],
    evaluations: [],
    users: [{ id: USER.id, plan_tier: 'free' }],
  };
});

describe('POST /answer — FM-5 Redis outage degrades to save-without-eval', () => {
  it('saves the answer as pending_backfill and skips evaluation entirely', async () => {
    checkRateLimitMock = vi.fn(async () => redisDown);

    const res = await POST(req(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.pendingEvaluation).toBe(true);
    expect(json.score).toBeNull();
    expect(json.evaluationId).toBeNull();
    expect(json.feedback).toMatch(/answer recorded/i);
    expect(json.feedback).toMatch(/evaluation pending/i);

    // Answer persisted with the explicit degraded marker…
    expect(db.answers).toHaveLength(1);
    expect(db.answers[0].evaluation_status).toBe('pending_backfill');
    expect(db.answers[0].answer_text).toBe(validBody.answerText);
    // …and no score was fabricated: no LLM call, no evaluation row.
    expect(evaluateAnswerMock).not.toHaveBeenCalled();
    expect(db.evaluations).toHaveLength(0);
  });

  it('is idempotent: a duplicate submit during the outage does not insert twice', async () => {
    checkRateLimitMock = vi.fn(async () => redisDown);
    db.answers = [{ id: 'a-existing', question_id: Q1, evaluation_status: 'pending_backfill' }];

    const res = await POST(req(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.idempotent).toBe(true);
    expect(db.answers).toHaveLength(1);
    expect(evaluateAnswerMock).not.toHaveBeenCalled();
  });

  it('fails closed (503) when migration 053 is absent instead of saving an unmarked answer', async () => {
    checkRateLimitMock = vi.fn(async () => redisDown);
    dbError = (table, mode) =>
      table === 'answers' && mode === 'insert'
        ? { message: 'column "evaluation_status" of relation "answers" does not exist' }
        : null;

    const res = await POST(req(validBody));
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.code).toBe('rate_limit_backend_unavailable');
    expect(evaluateAnswerMock).not.toHaveBeenCalled();
  });
});

describe('POST /answer — non-outage rate limiting is unchanged', () => {
  it('still 429s a genuinely over-limit user when Redis is healthy', async () => {
    checkRateLimitMock = vi.fn(async () => overLimit);

    const res = await POST(req(validBody));
    expect(res.status).toBe(429);
    expect(db.answers).toHaveLength(0);
    expect(evaluateAnswerMock).not.toHaveBeenCalled();
  });

  it('healthy path evaluates inline and does not mark pending_backfill', async () => {
    const res = await POST(req(validBody));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.score).toBe(7);
    expect(evaluateAnswerMock).toHaveBeenCalledTimes(1);
    expect(db.answers).toHaveLength(1);
    expect(db.answers[0].evaluation_status).toBeUndefined();
    expect(db.evaluations).toHaveLength(1);
    expect(db.evaluations[0].overall_score).toBe(7);
  });
});
