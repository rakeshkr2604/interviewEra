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
  order?: { column: string; ascending: boolean };
  limit?: number;
};

/**
 * Minimal chainable mock: records filters and returns scripted pages.
 * Simulates PostgREST filter semantics for the recovery queries.
 */
function createMockClient(pages: {
  active?: RecoveryInterviewRow[];
  abandoned?: RecoveryInterviewRow[];
}): { client: RecoveryQueryClient; calls: MockCall[] } {
  const calls: MockCall[] = [];

  const client: RecoveryQueryClient = {
    from: (table: string) => {
      expect(table).toBe('interviews');
      const state: MockCall = { filters: {}, inFilters: {} };
      const builder: Record<string, unknown> = {};
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
        order: (column: string, opts: { ascending: boolean }) => {
          state.order = { column, ascending: opts.ascending };
          return api;
        },
        limit: (count: number) => {
          state.limit = count;
          calls.push({ ...state, inFilters: { ...state.inFilters }, filters: { ...state.filters } });
          const isActive = Array.isArray(state.inFilters.status);
          const data = isActive ? (pages.active ?? []) : (pages.abandoned ?? []);
          return Promise.resolve({ data, error: null });
        },
      };
      void builder;
      return api;
    },
  };

  return { client, calls };
}

describe('fetchPrimaryRecoveryInterview', () => {
  it('returns active when present (does not depend on a 20-row window)', async () => {
    const { client, calls } = createMockClient({
      active: [row({ id: 'live', status: 'in_progress' })],
      abandoned: [row({ id: 'old-eligible', status: 'abandoned' })],
    });
    const pick = await fetchPrimaryRecoveryInterview(client, 'user-1');
    expect(pick).toMatchObject({ id: 'live', mode: 'continue' });
    expect(calls[0]?.inFilters.status).toEqual(['pending', 'in_progress']);
    expect(calls[0]?.filters.engine).toBe('v2.1');
    expect(calls[0]?.limit).toBe(1);
    // Abandoned query not needed once active is found
    expect(calls).toHaveLength(1);
  });

  it('surfaces eligible abandoned even when recent list would be filled with newer non-eligible rows', async () => {
    // Simulates: DB active query empty; abandoned query returns the eligible
    // row that would sit beyond a "latest 20" window of completed/ended rows.
    const { client, calls } = createMockClient({
      active: [],
      abandoned: [
        row({
          id: 'eligible-old',
          status: 'abandoned',
          started_at: '2026-07-01T00:00:00Z',
          credit_deducted: true,
          abandoned_resume_used: false,
        }),
      ],
    });
    const pick = await fetchPrimaryRecoveryInterview(client, 'user-1');
    expect(pick).toMatchObject({ id: 'eligible-old', mode: 'resume' });
    expect(calls[1]?.filters).toMatchObject({
      engine: 'v2.1',
      status: 'abandoned',
      credit_deducted: true,
      abandoned_resume_used: false,
    });
    expect(calls[1]?.order).toEqual({ column: 'started_at', ascending: false });
    expect(calls[1]?.limit).toBe(1);
  });

  it('a newer non-eligible interview cannot hide an older eligible recovery target', async () => {
    // The abandoned query only returns eligible rows — completed/ineligible never
    // enter the result set, so they cannot displace the eligible target.
    const { client } = createMockClient({
      active: [],
      abandoned: [row({ id: 'still-visible', status: 'abandoned' })],
    });
    const pick = await fetchPrimaryRecoveryInterview(client, 'user-1');
    expect(pick?.id).toBe('still-visible');
  });

  it('returns null when only ineligible abandoned / completed exist', async () => {
    const { client } = createMockClient({ active: [], abandoned: [] });
    await expect(fetchPrimaryRecoveryInterview(client, 'user-1')).resolves.toBeNull();
  });

  it('rejects abandoned rows that slip through without eligibility', async () => {
    const { client } = createMockClient({
      active: [],
      abandoned: [
        row({
          id: 'bad',
          status: 'abandoned',
          credit_deducted: false,
          abandoned_resume_used: false,
        }),
      ],
    });
    // Defense in depth if filters are misconfigured
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(fetchPrimaryRecoveryInterview(client, 'user-1')).resolves.toBeNull();
  });
});
