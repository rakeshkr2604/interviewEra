import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computeFunnelMetrics,
  countCohortReturnVisit,
  type FunnelCohortUser,
} from '@/lib/admin/funnel-metrics';

type Row = Record<string, unknown>;

function makeFunnelClient(tables: {
  users: Row[];
  resumes?: Row[];
  interviews?: Row[];
  product_events?: Row[];
  user_activity?: Row[];
  payments?: Row[];
  reports?: Row[];
}): SupabaseClient {
  const client = {
    from(table: string) {
      const rows = (tables[table as keyof typeof tables] ?? []) as Row[];

      const build = (selected: Row[], filters: Array<(r: Row) => boolean> = []) => {
        const apply = () => rows.filter((r) => filters.every((f) => f(r)));
        const api: Record<string, unknown> = {
          select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head && opts.count === 'exact') {
              return {
                in: (col: string, vals: unknown[]) => ({
                  in: () => ({
                    gte: async () => ({ count: apply().filter((r) => vals.includes(r[col])).length, data: null, error: null }),
                    then: undefined,
                  }),
                  gte: async () => ({
                    count: apply().filter((r) => vals.includes(r[col])).length,
                    data: null,
                    error: null,
                  }),
                  eq: async () => ({
                    count: apply().filter((r) => vals.includes(r[col])).length,
                    data: null,
                    error: null,
                  }),
                }),
                eq: (col: string, val: unknown) => ({
                  gte: async () => ({
                    count: apply().filter((r) => r[col] === val).length,
                    data: null,
                    error: null,
                  }),
                  in: async () => ({
                    count: apply().filter((r) => r[col] === val).length,
                    data: null,
                    error: null,
                  }),
                }),
                gte: async (col: string, val: string) => ({
                  count: apply().filter((r) => String(r[col]) >= val).length,
                  data: null,
                  error: null,
                }),
              };
            }

            const chain: Record<string, unknown> = {};
            const finish = async () => ({ data: apply(), error: null });

            chain.in = (col: string, vals: unknown[]) => {
              filters.push((r) => vals.includes(r[col]));
              return {
                in: (col2: string, vals2: unknown[]) => {
                  filters.push((r) => vals2.includes(r[col2]));
                  return {
                    eq: (col3: string, val3: unknown) => {
                      filters.push((r) => r[col3] === val3);
                      return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
                    },
                    neq: (col3: string, val3: unknown) => {
                      filters.push((r) => r[col3] !== val3);
                      return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
                    },
                    then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r),
                  };
                },
                eq: (col2: string, val2: unknown) => {
                  filters.push((r) => r[col2] === val2);
                  return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
                },
                neq: (col2: string, val2: unknown) => {
                  filters.push((r) => r[col2] !== val2);
                  return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
                },
                gte: (col2: string, val2: string) => {
                  filters.push((r) => String(r[col2]) >= val2);
                  return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
                },
                then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r),
              };
            };

            chain.gte = (col: string, val: string) => {
              filters.push((r) => String(r[col]) >= val);
              return {
                lt: (col2: string, val2: string) => {
                  filters.push((r) => String(r[col2]) < val2);
                  return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
                },
                then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r),
              };
            };

            chain.eq = (col: string, val: unknown) => {
              filters.push((r) => r[col] === val);
              return { then: (r: (v: unknown) => unknown) => Promise.resolve(finish()).then(r) };
            };

            return chain;
          },
        };
        return api;
      };

      return build(rows);
    },
  };
  return client as unknown as SupabaseClient;
}

const SINCE = '2026-01-01T00:00:00.000Z';

describe('countCohortReturnVisit — D7 boundary', () => {
  it('counts only users with last_seen >= created + 7d', async () => {
    const cohort: FunnelCohortUser[] = [
      { id: 'u1', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'u2', created_at: '2026-01-01T00:00:00.000Z' },
      { id: 'u3', created_at: '2026-01-01T00:00:00.000Z' },
    ];
    const svc = makeFunnelClient({
      users: cohort,
      user_activity: [
        { user_id: 'u1', last_seen_at: '2026-01-08T00:00:00.000Z' }, // exactly D7
        { user_id: 'u2', last_seen_at: '2026-01-07T23:59:59.000Z' }, // before D7
        { user_id: 'u3', last_seen_at: '2026-01-10T00:00:00.000Z' }, // after D7
      ],
    });

    await expect(countCohortReturnVisit(svc, SINCE, cohort)).resolves.toBe(2);
  });

  it('returns 0 for empty cohort without querying activity', async () => {
    const svc = makeFunnelClient({ users: [] });
    await expect(countCohortReturnVisit(svc, SINCE, [])).resolves.toBe(0);
  });
});

describe('computeFunnelMetrics — fixture parity', () => {
  it('reuses one cohort and preserves step semantics', async () => {
    const users = [
      { id: 'u1', created_at: '2026-02-01T00:00:00.000Z' },
      { id: 'u2', created_at: '2026-02-02T00:00:00.000Z' },
      { id: 'u3', created_at: '2026-02-03T00:00:00.000Z' },
    ];
    const svc = makeFunnelClient({
      users,
      resumes: [{ user_id: 'u1' }, { user_id: 'u2' }],
      interviews: [
        { id: 'i1', user_id: 'u1', status: 'completed' },
        { id: 'i2', user_id: 'u2', status: 'pending' },
        { id: 'i3', user_id: 'u3', status: 'in_progress' },
      ],
      product_events: [
        { id: 'e1', event_name: 'page_view', created_at: '2026-02-01T00:00:00.000Z', user_id: null },
        { id: 'e2', event_name: 'page_view', created_at: '2026-02-01T00:00:00.000Z', user_id: null },
        { id: 'e3', event_name: 'report_viewed', created_at: '2026-02-05T00:00:00.000Z', user_id: 'u1' },
        { id: 'e3b', event_name: 'report_viewed', created_at: '2026-02-06T00:00:00.000Z', user_id: 'u1' },
      ],
      user_activity: [
        { user_id: 'u1', last_seen_at: '2026-02-10T00:00:00.000Z' },
      ],
      payments: [{ user_id: 'u1', status: 'paid' }],
      reports: [],
    });

    const metrics = await computeFunnelMetrics(svc, 30, { sinceIso: SINCE });
    const byKey = Object.fromEntries(metrics.steps.map((s) => [s.key, s.count]));

    expect(metrics.cohort_signups).toBe(3);
    expect(byKey.signup).toBe(3);
    expect(byKey.resume).toBe(2);
    expect(byKey.interview_started).toBe(2); // pending excluded
    expect(byKey.interview_completed).toBe(1);
    expect(byKey.report_viewed).toBe(1); // distinct users, not event rows
    expect(byKey.return_visit).toBe(1);
    expect(byKey.paid).toBe(1);
  });
});
