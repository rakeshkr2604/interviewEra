import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeDb } from '@/test-utils/supabase-fake';
import { makeFakeServiceClient } from '@/test-utils/supabase-fake';

const IV = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';
const OWNER = 'aaaaaaaa-1111-4111-8111-111111111111';
const OTHER = 'bbbbbbbb-2222-4222-8222-222222222222';

const state = vi.hoisted(() => ({
  userId: null as string | null,
  rateAllowed: true,
  rateReason: undefined as
    | 'redis_unconfigured'
    | 'user_limited'
    | 'interview_limited'
    | 'redis_unavailable'
    | undefined,
  db: { interviews: [], interview_diagnostic_events: [] } as FakeDb,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () =>
        state.userId
          ? { data: { user: { id: state.userId, email: 'u@example.com' } }, error: null }
          : { data: { user: null }, error: { message: 'no' } },
    },
  }),
  createServiceClient: () => makeFakeServiceClient(state.db),
}));

vi.mock('@/lib/diagnostics/rate-limit-gate', () => ({
  checkDiagnosticIngestRateLimit: async () =>
    state.rateAllowed
      ? { allowed: true }
      : { allowed: false, reason: state.rateReason ?? 'user_limited' },
}));

import { POST } from './route';

function req(body: unknown): Request {
  return new Request('http://localhost/api/interview/diagnostics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/interview/diagnostics', () => {
  beforeEach(() => {
    state.userId = OWNER;
    state.rateAllowed = true;
    state.rateReason = undefined;
    state.db = {
      interviews: [{ id: IV, user_id: OWNER, engine: 'v2.1' }],
      interview_diagnostic_events: [],
    };
  });

  it('rejects unauthenticated callers', async () => {
    state.userId = null;
    const res = await POST(
      req({
        interview_id: IV,
        events: [{ event_type: 'mic_permission_denied', occurred_at: new Date().toISOString() }],
      }),
    );
    expect(res.status).toBe(401);
  });

  it('returns not-found for non-owners without inserting', async () => {
    state.userId = OTHER;
    const res = await POST(
      req({
        interview_id: IV,
        events: [{ event_type: 'mic_permission_denied', occurred_at: new Date().toISOString() }],
      }),
    );
    expect(res.status).toBe(404);
    expect(state.db.interview_diagnostic_events).toHaveLength(0);
  });

  it('accepts owner events and persists', async () => {
    const res = await POST(
      req({
        interview_id: IV,
        events: [
          {
            event_type: 'stt_connection_failed',
            occurred_at: new Date().toISOString(),
            client_event_id: 'cccccccc-3333-4333-8333-333333333333',
            error_code: 'stt_ws_error',
            metadata: { component: 'stt' },
          },
        ],
      }),
    );
    expect(res.status).toBe(204);
    expect(state.db.interview_diagnostic_events).toHaveLength(1);
    expect(state.db.interview_diagnostic_events[0].user_id).toBe(OWNER);
    expect(state.db.interview_diagnostic_events[0].confirmation).toBe('client_reported');
  });

  it('drops with 204 when Redis is unconfigured (no insert)', async () => {
    state.rateAllowed = false;
    state.rateReason = 'redis_unconfigured';
    const res = await POST(
      req({
        interview_id: IV,
        events: [{ event_type: 'network_offline', occurred_at: new Date().toISOString() }],
      }),
    );
    expect(res.status).toBe(204);
    expect(state.db.interview_diagnostic_events).toHaveLength(0);
  });

  it('rate-limits with 204 and no insert', async () => {
    state.rateAllowed = false;
    state.rateReason = 'user_limited';
    const res = await POST(
      req({
        interview_id: IV,
        events: [{ event_type: 'network_offline', occurred_at: new Date().toISOString() }],
      }),
    );
    expect(res.status).toBe(204);
    expect(state.db.interview_diagnostic_events).toHaveLength(0);
  });

  it('rejects unknown event types before persistence', async () => {
    const res = await POST(
      req({
        interview_id: IV,
        events: [{ event_type: 'not_real', occurred_at: new Date().toISOString() }],
      }),
    );
    expect(res.status).toBe(400);
    expect(state.db.interview_diagnostic_events).toHaveLength(0);
  });
});
