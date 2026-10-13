import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeRetention } from '@/lib/admin/growth-metrics';

type Row = Record<string, unknown>;

function makeClient(users: Row[], activity: Row[], interviews: Row[]): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'users') {
        return {
          select: () => ({
            gte: () => ({
              lt: async () => ({ data: users, error: null }),
            }),
          }),
        };
      }
      if (table === 'user_activity') {
        return {
          select: () => ({
            in: async (_col: string, ids: string[]) => ({
              data: activity.filter((r) => ids.includes(r.user_id as string)),
              error: null,
            }),
          }),
        };
      }
      if (table === 'interviews') {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => ({
              gte: () => ({
                lte: async () => ({
                  data: interviews.filter((r) => ids.includes(r.user_id as string)),
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

describe('computeRetention — set-based parity', () => {
  it('counts activity returns inside the Dn window', async () => {
    const now = Date.now();
    const created = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString(); // in D1 cohort window
    const users = [{ id: 'u1', created_at: created }];
    const activity = [
      {
        user_id: 'u1',
        last_seen_at: new Date(new Date(created).getTime() + 12 * 60 * 60 * 1000).toISOString(),
      },
    ];
    const result = await computeRetention(makeClient(users, activity, []), 1);
    expect(result.cohort_size).toBe(1);
    expect(result.retained).toBe(1);
  });

  it('falls back to interviews when activity is outside the window', async () => {
    const now = Date.now();
    const created = new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString();
    const users = [{ id: 'u1', created_at: created }];
    const activity = [
      {
        user_id: 'u1',
        // last seen after D1 window end → not retained by activity
        last_seen_at: new Date(new Date(created).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    const interviews = [
      {
        user_id: 'u1',
        started_at: new Date(new Date(created).getTime() + 6 * 60 * 60 * 1000).toISOString(),
      },
    ];
    const result = await computeRetention(makeClient(users, activity, interviews), 1);
    expect(result.retained).toBe(1);
  });
});
