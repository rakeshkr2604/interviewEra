import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { countCohortFirstInterview } from '@/lib/admin/funnel-metrics';

type Row = Record<string, unknown>;

/**
 * Minimal hand-built stub covering exactly the chain `countCohortFirstInterview`
 * uses: users.select().gte(), then interviews.select().in().eq()/.neq(). Not a
 * general Supabase fake — just enough to exercise the "started excludes
 * pending" fix deterministically.
 */
function makeClient(users: Row[], interviews: Row[]): SupabaseClient {
  const client = {
    from(table: string) {
      if (table === 'users') {
        return {
          select: () => ({
            gte: async () => ({ data: users, error: null }),
          }),
        };
      }
      if (table === 'interviews') {
        return {
          select: () => ({
            in: (_col: string, ids: string[]) => {
              const scoped = interviews.filter((r) => ids.includes(r.user_id as string));
              return {
                eq: async (col: string, val: unknown) => ({
                  data: scoped.filter((r) => r[col] === val),
                  error: null,
                }),
                neq: async (col: string, val: unknown) => ({
                  data: scoped.filter((r) => r[col] !== val),
                  error: null,
                }),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
  return client as unknown as SupabaseClient;
}

const SINCE = '2026-01-01T00:00:00Z';

describe('countCohortFirstInterview — "started" definition', () => {
  it('excludes pending rows from the started count', async () => {
    const users = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];
    const interviews = [
      { user_id: 'u1', status: 'pending' }, // created, question gen never resolved — never actually started
      { user_id: 'u2', status: 'in_progress' },
      { user_id: 'u3', status: 'completed' },
    ];
    const svc = makeClient(users, interviews);

    const started = await countCohortFirstInterview(svc, SINCE, false);

    expect(started).toBe(2); // u2 (in_progress) + u3 (completed) — u1 (pending) excluded
  });

  it('still counts in_progress, completed, and abandoned as started', async () => {
    const users = [{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }];
    const interviews = [
      { user_id: 'u1', status: 'in_progress' },
      { user_id: 'u2', status: 'completed' },
      { user_id: 'u3', status: 'abandoned' },
    ];
    const svc = makeClient(users, interviews);

    const started = await countCohortFirstInterview(svc, SINCE, false);

    expect(started).toBe(3);
  });

  it('completed=true is unaffected — still filters strictly to status=completed', async () => {
    const users = [{ id: 'u1' }, { id: 'u2' }];
    const interviews = [
      { user_id: 'u1', status: 'in_progress' },
      { user_id: 'u2', status: 'completed' },
    ];
    const svc = makeClient(users, interviews);

    const completed = await countCohortFirstInterview(svc, SINCE, true);

    expect(completed).toBe(1);
  });

  it('a user with only a pending interview no longer counts as started', async () => {
    const users = [{ id: 'u1' }];
    const interviews = [{ user_id: 'u1', status: 'pending' }];
    const svc = makeClient(users, interviews);

    const started = await countCohortFirstInterview(svc, SINCE, false);

    expect(started).toBe(0);
  });
});
