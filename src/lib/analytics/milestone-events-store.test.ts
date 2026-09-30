import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  after: (task: () => void) => {
    task();
  },
}));

/**
 * `persistMilestoneEventOnce` is the at-most-one insert path backing the
 * startup-funnel milestones and interview_started/interview_completed/
 * interview_abandoned. The partial unique indexes in migration 052 do the
 * actual dedupe; this suite verifies the client-side contract: a
 * unique_violation (23505) is treated as "already recorded" (silent, not
 * warned), while any other DB error is a real failure and is logged.
 * Delivery is not guaranteed.
 */

let insertResult: { error: { code: string; message: string } | null };
const insertMock = vi.fn(async () => insertResult);
const fromMock = vi.fn(() => ({ insert: insertMock }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: fromMock }),
}));

import {
  persistMilestoneEventOnce,
  persistMilestoneEventOnceAsync,
  resetMilestoneEventServiceClientCacheForTests,
} from '@/lib/analytics/milestone-events-store';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('persistMilestoneEventOnce', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
    resetMilestoneEventServiceClientCacheForTests();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('inserts with the expected shape, splitting user_id out of props', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    insertResult = { error: null };

    persistMilestoneEventOnce('interview_started', {
      user_id: 'user-1',
      interview_id: 'iv-1',
      role: 'backend',
    });
    await flush();

    expect(fromMock).toHaveBeenCalledWith('product_events');
    expect(insertMock).toHaveBeenCalledWith({
      event_name: 'interview_started',
      user_id: 'user-1',
      props: { interview_id: 'iv-1', role: 'backend' },
    });
  });

  it('swallows a 23505 unique_violation silently (expected repeat-fire outcome)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    insertResult = { error: { code: '23505', message: 'duplicate key value violates unique constraint' } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistMilestoneEventOnce('interview_completed', { interview_id: 'iv-1' });
    await flush();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('logs a warning for a non-dedupe DB error', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    insertResult = { error: { code: '42501', message: 'permission denied' } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    persistMilestoneEventOnce('interview_completed', { interview_id: 'iv-1' });
    await flush();

    expect(warnSpy).toHaveBeenCalledWith('[milestone-events-store] insert failed:', 'permission denied');
  });

  it('no-ops without throwing when service credentials are absent', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() =>
      persistMilestoneEventOnce('interview_started', { interview_id: 'iv-1' }),
    ).not.toThrow();
    await flush();

    expect(insertMock).not.toHaveBeenCalled();
  });
});

describe('persistMilestoneEventOnceAsync', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    insertMock.mockClear();
    fromMock.mockClear();
    resetMilestoneEventServiceClientCacheForTests();
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('returns ok:true on insert success and ok with alreadyRecorded on 23505', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

    insertResult = { error: null };
    await expect(
      persistMilestoneEventOnceAsync('interview_abandoned', {
        user_id: 'user-1',
        interview_id: 'iv-1',
        source: 'stale_cron',
      }),
    ).resolves.toEqual({ ok: true });

    insertResult = {
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    };
    await expect(
      persistMilestoneEventOnceAsync('interview_abandoned', {
        user_id: 'user-1',
        interview_id: 'iv-1',
        source: 'stale_cron',
      }),
    ).resolves.toEqual({ ok: true, alreadyRecorded: true });
  });

  it('returns ok:false without throwing on DB or credential failure', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    insertResult = { error: { code: '42501', message: 'permission denied' } };
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      persistMilestoneEventOnceAsync('interview_abandoned', { interview_id: 'iv-1' }),
    ).resolves.toEqual({ ok: false, error: 'permission denied' });
    expect(warnSpy).toHaveBeenCalled();

    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetMilestoneEventServiceClientCacheForTests();
    await expect(
      persistMilestoneEventOnceAsync('interview_abandoned', { interview_id: 'iv-1' }),
    ).resolves.toEqual({ ok: false, error: 'service_client_unavailable', skipped: true });
  });
});
