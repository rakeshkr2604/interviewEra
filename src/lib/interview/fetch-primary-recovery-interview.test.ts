import { describe, expect, it, vi } from 'vitest';
import {
  fetchPrimaryRecoveryInterview,
  resolvePrimaryRecoveryTarget,
  type RecoveryInterviewRow,
  type RecoveryQueryClient,
} from './fetch-primary-recovery-interview';

function row(partial: Partial<RecoveryInterviewRow> & Pick<RecoveryInterviewRow, 'id' | 'status'>): RecoveryInterviewRow {
  return {
    role: partial.role ?? 'Role',
    engine: partial.engine ?? 'v2.1',
    started_at: partial.started_at ?? '2026-01-01T00:00:00.000Z',
    credit_deducted: partial.credit_deducted ?? true,
    abandoned_resume_used: partial.abandoned_resume_used ?? false,
    ...partial,
  };
}

describe('resolvePrimaryRecoveryTarget', () => {
  it('prefers active over abandoned eligible', () => {
    const pick = resolvePrimaryRecoveryTarget([
      row({ id: 'ab', status: 'abandoned', started_at: '2026-09-01T00:00:00Z' }),
      row({ id: 'act', status: 'in_progress', started_at: '2026-08-01T00:00:00Z' }),
    ]);
    expect(pick).toMatchObject({ id: 'act', mode: 'continue' });
  });

  it('picks newest eligible abandoned when no active (caller order newest-first)', () => {
    const pick = resolvePrimaryRecoveryTarget([
      row({ id: 'new', status: 'abandoned', started_at: '2026-09-20T00:00:00Z' }),
      row({ id: 'old', status: 'abandoned', started_at: '2026-07-01T00:00:00Z' }),
    ]);
    expect(pick?.id).toBe('new');
    expect(pick?.mode).toBe('resume');
  });

  it('never selects completed or ineligible abandoned', () => {
    expect(
      resolvePrimaryRecoveryTarget([
        row({ id: 'done', status: 'completed' }),
        row({ id: 'used', status: 'abandoned', abandoned_resume_used: true }),
        row({ id: 'nocredit', status: 'abandoned', credit_deducted: false }),
      ]),
    ).toBeNull();
  });

  it('ignores non-v2.1 engines for recovery selection', () => {
    expect(
      resolvePrimaryRecoveryTarget([
        row({ id: 'v1', status: 'in_progress', engine: 'v1' }),
        row({ id: 'v1a', status: 'abandoned', engine: 'v1' }),
      ]),
    ).toBeNull();
  });
});

type MockCall = {
  filters: Record<string, unknown>;
  inFilters: Record<string, string[]>;
  or?: string;
  order?: { column: string; ascending: boolean };
  limit?: number;
};

/**
 * Minimal chainable mock: records filters and returns one scripted page.
 * `rows` stands in for what the eligible-only `or` filter would return.
 */
function createMockClient(rows: RecoveryInterviewRow[]): {
  client: RecoveryQueryClient;
  calls: MockCall[];
} {
  const calls: MockCall[] = [];

  const client: RecoveryQueryClient = {
    from: (table: string) => {
      expect(table).toBe('interviews');
      const state: MockCall = { filters: {}, inFilters: {} };
      const api = {
        select: () => api,
        eq: (column: string, value: string | boolean) => {
          state.filters[column] = value;
          return api;
        },
        in: (column: string, values: string[]) => {
          state.inFilters[column] = values;
          return api;
        },
        or: (filter: string) => {
          state.or = filter;
          return api;
        },
        order: (column: string, opts: { ascending: boolean }) => {
          state.order = { column, ascending: opts.ascending };
          return api;
        },
        limit: (count: number) => {
          state.limit = count;
          calls.push({ ...state, inFilters: { ...state.inFilters }, filters: { ...state.filters } });
          return Promise.resolve({ data: rows, error: null });
        },
      };
      return api;
    },
  };

  return { client, calls };
}

describe('fetchPrimaryRecoveryInterview', () => {
  it('resolves the target in a single user-scoped, eligible-only query', async () => {
    const { client, calls } = createMockClient([row({ id: 'live', status: 'in_progress' })]);
    await fetchPrimaryRecoveryInterview(client, 'user-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]?.filters).toMatchObject({ user_id: 'user-1', engine: 'v2.1' });
    // Only recovery-eligible rows enter the window, so ineligible history can
    // never crowd out the target within the row cap.
    expect(calls[0]?.or).toContain('status.in.(pending,in_progress)');
    expect(calls[0]?.or).toContain('status.eq.abandoned');
    expect(calls[0]?.or).toContain('credit_deducted.is.true');
    expect(calls[0]?.or).toContain('abandoned_resume_used.is.false');
    expect(calls[0]?.order).toEqual({ column: 'started_at', ascending: false });
    expect(calls[0]?.limit).toBeGreaterThan(0);
  });

  it('returns active when present (does not depend on a 20-row window)', async () => {
    // Abandoned row is newer, but active always wins the priority rule.
    const { client } = createMockClient([
      row({ id: 'old-eligible', status: 'abandoned', started_at: '2026-09-01T00:00:00Z' }),
      row({ id: 'live', status: 'in_progress', started_at: '2026-08-01T00:00:00Z' }),
    ]);
    const pick = await fetchPrimaryRecoveryInterview(client, 'user-1');
    expect(pick).toMatchObject({ id: 'live', mode: 'continue' });
  });

  it('surfaces eligible abandoned even when recent list would be filled with newer non-eligible rows', async () => {
    // The eligible-only filter means completed/ended rows never occupy the
    // window, so a row beyond a "latest 20" page is still reachable.
    const { client } = createMockClient([
      row({
        id: 'eligible-old',
        status: 'abandoned',
        started_at: '2026-07-01T00:00:00Z',
        credit_deducted: true,
        abandoned_resume_used: false,
      }),
    ]);
    const pick = await fetchPrimaryRecoveryInterview(client, 'user-1');
    expect(pick).toMatchObject({ id: 'eligible-old', mode: 'resume' });
  });

  it('a newer non-eligible interview cannot hide an older eligible recovery target', async () => {
    const { client } = createMockClient([row({ id: 'still-visible', status: 'abandoned' })]);
    const pick = await fetchPrimaryRecoveryInterview(client, 'user-1');
    expect(pick?.id).toBe('still-visible');
  });

  it('returns null when only ineligible abandoned / completed exist', async () => {
    const { client } = createMockClient([]);
    await expect(fetchPrimaryRecoveryInterview(client, 'user-1')).resolves.toBeNull();
  });

  it('rejects abandoned rows that slip through without eligibility', async () => {
    const { client } = createMockClient([
      row({
        id: 'bad',
        status: 'abandoned',
        credit_deducted: false,
        abandoned_resume_used: false,
      }),
    ]);
    // Defense in depth if the SQL filter is ever misconfigured
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchPrimaryRecoveryInterview(client, 'user-1')).resolves.toBeNull();
  });
});
