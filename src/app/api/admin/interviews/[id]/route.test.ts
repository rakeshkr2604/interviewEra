import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

const IV_ID = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';
const OWNER_ID = 'aaaaaaaa-1111-4111-8111-111111111111';
const ADMIN_ID = 'bbbbbbbb-2222-4222-8222-222222222222';

const state = vi.hoisted(() => ({
  mode: 'admin' as 'admin' | 'unauth' | 'forbidden',
  serviceCalls: 0,
}));

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: vi.fn(async () => {
    if (state.mode === 'unauth') {
      return {
        admin: null,
        error: Response.json({ error: 'Unauthorized' }, { status: 401 }),
      };
    }
    if (state.mode === 'forbidden') {
      return {
        admin: null,
        error: Response.json({ error: 'Forbidden' }, { status: 403 }),
      };
    }
    return {
      admin: { id: ADMIN_ID, email: 'admin@interviewera.com' },
      error: null,
    };
  }),
}));

let db: FakeDb;

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => {
    state.serviceCalls += 1;
    return makeFakeServiceClient(db);
  },
}));

import { GET } from './route';

const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe('GET /api/admin/interviews/[id]', () => {
  beforeEach(() => {
    state.mode = 'admin';
    state.serviceCalls = 0;
    db = {
      interviews: [
        {
          id: IV_ID,
          user_id: OWNER_ID,
          role: 'SDE Intern',
          difficulty: 'medium',
          engine: 'v2.1',
          script_type: 'SCRIPT_H',
          status: 'abandoned',
          started_at: '2026-10-01T10:00:00.000Z',
          completed_at: '2026-10-01T10:20:00.000Z',
          current_turn_index: 2,
          credit_deducted: true,
        },
      ],
      users: [{ id: OWNER_ID, email: 'candidate@example.com', name: 'Candidate' }],
      script_turns: [
        {
          interview_id: IV_ID,
          turn_index: 1,
          phase: 'core',
          is_question: true,
          question_type: 'technical',
          llm_output: { display_question: 'Explain indexing', speech: 'Explain indexing' },
          raw_transcript: null,
          answer_text: 'B-tree indexes speed lookups',
          submitted_as: 'raw',
          created_at: '2026-10-01T10:05:00.000Z',
        },
      ],
      answer_evaluations: [],
      script_interview_reports: [],
      questions: [],
      answers: [],
      credit_transactions: [],
      product_events: [],
      ai_call_logs: [],
      voice_usage_logs: [],
      interview_exit_feedbacks: [],
      interview_feedbacks: [],
      technical_failure_cases: [],
      feedbacks: [],
      interview_diagnostic_events: [],
    };
  });

  it('rejects unauthenticated callers before creating a service client', async () => {
    state.mode = 'unauth';
    const res = await GET(new Request('http://localhost/api/admin/interviews/' + IV_ID), params(IV_ID));
    expect(res.status).toBe(401);
    expect(state.serviceCalls).toBe(0);
  });

  it('rejects authenticated non-admins before creating a service client', async () => {
    state.mode = 'forbidden';
    const res = await GET(new Request('http://localhost/api/admin/interviews/' + IV_ID), params(IV_ID));
    expect(res.status).toBe(403);
    expect(state.serviceCalls).toBe(0);
  });

  it('allows a platform admin to inspect another user abandoned interview', async () => {
    const res = await GET(new Request('http://localhost/api/admin/interviews/' + IV_ID), params(IV_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.interview.id).toBe(IV_ID);
    expect(body.interview.user_id).toBe(OWNER_ID);
    expect(body.interview.user_id).not.toBe(ADMIN_ID);
    expect(body.interview.status).toBe('abandoned');
    expect(body.report).toBeNull();
    expect(body.turns).toHaveLength(1);
    expect(body.turns[0].answer_text).toBe('B-tree indexes speed lookups');
  });

  it('returns not-found for nonexistent interviews after authorization', async () => {
    const missing = 'cccccccc-3333-4333-8333-333333333333';
    const res = await GET(
      new Request('http://localhost/api/admin/interviews/' + missing),
      params(missing),
    );
    expect(res.status).toBe(404);
    expect(state.serviceCalls).toBe(1);
  });

  it('returns not-found for invalid ids without querying', async () => {
    const res = await GET(
      new Request('http://localhost/api/admin/interviews/not-a-uuid'),
      params('not-a-uuid'),
    );
    expect(res.status).toBe(404);
    expect(state.serviceCalls).toBe(0);
  });
});
