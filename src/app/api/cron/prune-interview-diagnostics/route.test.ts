import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  secret: 'test-cron-secret',
  rpcResults: [] as number[],
  rpcCalls: 0,
  rpcError: null as { message: string } | null,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    rpc: async () => {
      if (state.rpcError) return { data: null, error: state.rpcError };
      const n = state.rpcResults[state.rpcCalls] ?? 0;
      state.rpcCalls += 1;
      return { data: n, error: null };
    },
  }),
}));

import { GET } from './route';

function req(auth?: string): Request {
  return new Request('http://localhost/api/cron/prune-interview-diagnostics', {
    method: 'GET',
    headers: auth ? { authorization: auth } : {},
  });
}

describe('GET /api/cron/prune-interview-diagnostics', () => {
  beforeEach(() => {
    state.rpcCalls = 0;
    state.rpcResults = [];
    state.rpcError = null;
    process.env.CRON_SECRET = state.secret;
  });

  it('rejects missing cron secret', async () => {
    const res = await GET(req() as never);
    expect(res.status).toBe(401);
  });

  it('runs bounded batches until empty', async () => {
    state.rpcResults = [500, 120];
    const res = await GET(req(`Bearer ${state.secret}`) as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deleted: number; batches: number };
    expect(body.deleted).toBe(620);
    expect(body.batches).toBe(2);
    expect(state.rpcCalls).toBe(2);
  });

  it('surfaces RPC failures without mutating other domains', async () => {
    state.rpcError = { message: 'boom' };
    const res = await GET(req(`Bearer ${state.secret}`) as never);
    expect(res.status).toBe(500);
  });
});
