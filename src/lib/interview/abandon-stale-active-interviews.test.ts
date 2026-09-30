import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import path from 'node:path'
import fs from 'node:fs'

const rpcMock = vi.fn()
const persistMilestoneMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({
    rpc: rpcMock,
  })),
}))

vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnceAsync: (...args: unknown[]) => persistMilestoneMock(...args),
}))

import { GET } from '@/app/api/cron/abandon-stale-interviews/route'
import {
  ABANDON_STALE_ACTIVE_INTERVIEWS_RPC,
  abandonStaleActiveInterviews,
  staleActiveInterviewCutoffIso,
} from '@/lib/interview/abandon-stale-active-interviews'
import { ACTIVE_INTERVIEW_STALE_AFTER_MS } from '@/lib/interview/active-interview-policy'

const ROW_A = {
  interview_id: '11111111-1111-4111-8111-111111111111',
  user_id: '22222222-2222-4222-8222-222222222222',
}
const ROW_B = {
  interview_id: '33333333-3333-4333-8333-333333333333',
  user_id: '44444444-4444-4444-8444-444444444444',
}

describe('abandonStaleActiveInterviews', () => {
  afterEach(() => {
    rpcMock.mockReset()
    persistMilestoneMock.mockReset()
  })

  it('calls the service-role RPC and attempts one milestone per returned row', async () => {
    rpcMock.mockResolvedValue({ data: [ROW_A, ROW_B], error: null })
    persistMilestoneMock.mockResolvedValue({ ok: true })

    const result = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)

    expect(rpcMock).toHaveBeenCalledWith(ABANDON_STALE_ACTIVE_INTERVIEWS_RPC)
    expect(persistMilestoneMock).toHaveBeenCalledTimes(2)
    expect(persistMilestoneMock).toHaveBeenNthCalledWith(1, 'interview_abandoned', {
      user_id: ROW_A.user_id,
      interview_id: ROW_A.interview_id,
      engine: 'v2.1',
      source: 'stale_cron',
    })
    expect(persistMilestoneMock).toHaveBeenNthCalledWith(2, 'interview_abandoned', {
      user_id: ROW_B.user_id,
      interview_id: ROW_B.interview_id,
      engine: 'v2.1',
      source: 'stale_cron',
    })
    expect(result).toEqual({
      ok: true,
      abandoned: 2,
      milestoneAttempts: 2,
      milestoneFailures: 0,
    })
  })

  it('emits zero milestones when RPC returns an empty set', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null })
    const result = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)
    expect(result).toEqual({
      ok: true,
      abandoned: 0,
      milestoneAttempts: 0,
      milestoneFailures: 0,
    })
    expect(persistMilestoneMock).not.toHaveBeenCalled()
  })

  it('treats null RPC data as empty success (zero milestones)', async () => {
    rpcMock.mockResolvedValue({ data: null, error: null })
    const result = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)
    expect(result).toEqual({
      ok: true,
      abandoned: 0,
      milestoneAttempts: 0,
      milestoneFailures: 0,
    })
    expect(persistMilestoneMock).not.toHaveBeenCalled()
  })

  it('milestone persistence failure does not fail abandonment', async () => {
    rpcMock.mockResolvedValue({ data: [ROW_A], error: null })
    persistMilestoneMock.mockResolvedValue({ ok: false, error: 'insert failed' })

    const result = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)

    expect(result).toEqual({
      ok: true,
      abandoned: 1,
      milestoneAttempts: 1,
      milestoneFailures: 1,
    })
  })

  it('rejects malformed RPC payloads without inventing milestones', async () => {
    rpcMock.mockResolvedValue({ data: 3, error: null })
    const asNumber = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)
    expect(asNumber).toEqual({ ok: false, error: 'Unexpected RPC return value' })
    expect(persistMilestoneMock).not.toHaveBeenCalled()

    rpcMock.mockResolvedValue({
      data: [{ interview_id: ROW_A.interview_id }],
      error: null,
    })
    const missingUser = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)
    expect(missingUser).toEqual({ ok: false, error: 'Unexpected RPC return value' })
    expect(persistMilestoneMock).not.toHaveBeenCalled()
  })

  it('surfaces RPC errors without inventing credit refunds or milestones', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    const result = await abandonStaleActiveInterviews({ rpc: rpcMock } as never)
    expect(result).toEqual({ ok: false, error: 'permission denied' })
    expect(persistMilestoneMock).not.toHaveBeenCalled()
  })

  it('cutoff matches ACTIVE_INTERVIEW_STALE_AFTER_MS (45 minutes)', () => {
    const now = Date.parse('2026-09-30T12:00:00.000Z')
    expect(staleActiveInterviewCutoffIso(now)).toBe(
      new Date(now - ACTIVE_INTERVIEW_STALE_AFTER_MS).toISOString(),
    )
    expect(ACTIVE_INTERVIEW_STALE_AFTER_MS).toBe(45 * 60 * 1000)
  })
})

describe('GET /api/cron/abandon-stale-interviews', () => {
  afterEach(() => {
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    rpcMock.mockReset()
    persistMilestoneMock.mockReset()
  })

  it('rejects without CRON_SECRET bearer (401)', async () => {
    process.env.CRON_SECRET = 'test-secret'
    const req = new NextRequest('http://localhost/api/cron/abandon-stale-interviews')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ error: 'Unauthorized' })
    expect(JSON.stringify(body)).not.toContain('test-secret')
  })

  it('returns success metrics when zero rows are abandoned', async () => {
    process.env.CRON_SECRET = 'test-secret'
    rpcMock.mockResolvedValue({ data: [], error: null })
    const req = new NextRequest('http://localhost/api/cron/abandon-stale-interviews', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      abandoned: 0,
      milestoneAttempts: 0,
      milestoneFailures: 0,
    })
  })

  it('returns success metrics when rows are abandoned', async () => {
    process.env.CRON_SECRET = 'test-secret'
    rpcMock.mockResolvedValue({ data: [ROW_A], error: null })
    persistMilestoneMock.mockResolvedValue({ ok: true })
    const req = new NextRequest('http://localhost/api/cron/abandon-stale-interviews', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      ok: true,
      abandoned: 1,
      milestoneAttempts: 1,
      milestoneFailures: 0,
    })
    expect(JSON.stringify(body)).not.toContain('test-secret')
    expect(body).not.toHaveProperty('interview_id')
    expect(body).not.toHaveProperty('user_id')
  })

  it('analytics persistence failure does not convert successful abandonment to 500', async () => {
    process.env.CRON_SECRET = 'test-secret'
    rpcMock.mockResolvedValue({ data: [ROW_A], error: null })
    persistMilestoneMock.mockResolvedValue({ ok: false, error: 'db down' })
    const req = new NextRequest('http://localhost/api/cron/abandon-stale-interviews', {
      headers: { authorization: 'Bearer test-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      abandoned: 1,
      milestoneAttempts: 1,
      milestoneFailures: 1,
    })
  })

  it('RPC failure still returns 500 without leaking the cron secret', async () => {
    process.env.CRON_SECRET = 'super-secret-value'
    rpcMock.mockResolvedValue({ data: null, error: { message: 'rpc exploded' } })
    const req = new NextRequest('http://localhost/api/cron/abandon-stale-interviews', {
      headers: { authorization: 'Bearer super-secret-value' },
    })
    const res = await GET(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'rpc exploded' })
    expect(JSON.stringify(body)).not.toContain('super-secret-value')
  })
})

describe('108 abandon_stale_active_interviews migration contract (historical, unchanged)', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase', 'migrations', '108_abandon_stale_active_interviews_rpc.sql'),
    'utf8',
  )

  it('keeps the integer-return 45-minute V2.1 sweeper without credit changes', () => {
    expect(sql).toContain('RETURNS INTEGER')
    expect(sql).toContain("INTERVAL '45 minutes'")
    expect(sql).toContain("engine = 'v2.1'")
    expect(sql).toContain("status IN ('pending', 'in_progress')")
    expect(sql).toContain("status = 'abandoned'")
    expect(sql).toContain('interview_last_activity_at')
    expect(sql).toContain('SKIP LOCKED')
    expect(sql).not.toMatch(/credits_remaining|credit_transactions|refund/i)
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.abandon_stale_active_interviews()')
    expect(sql).toContain('TO service_role')
  })

  it('authoritative UPDATE re-checks the stale activity predicate (not SELECT-only)', () => {
    const updateAt = sql.indexOf('UPDATE public.interviews AS i')
    expect(updateAt).toBeGreaterThan(-1)
    const updateBlock = sql.slice(updateAt)
    expect(updateBlock).toContain('public.interview_last_activity_at(i.id) < v_stale_before')
    expect(updateBlock).toContain("i.status IN ('pending', 'in_progress')")
    expect(updateBlock).toContain("i.engine = 'v2.1'")
  })
})

describe('109 abandon_stale_active_interviews return-ids migration contract', () => {
  const sql = fs.readFileSync(
    path.join(
      process.cwd(),
      'supabase',
      'migrations',
      '109_abandon_stale_active_interviews_return_ids.sql',
    ),
    'utf8',
  )

  it('returns interview_id + user_id with preserved safety semantics', () => {
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.abandon_stale_active_interviews()')
    expect(sql).toContain('RETURNS TABLE')
    expect(sql).toContain('interview_id UUID')
    expect(sql).toContain('user_id UUID')
    expect(sql).toContain('SECURITY DEFINER')
    expect(sql).toContain('SET search_path = public')
    expect(sql).toContain("INTERVAL '45 minutes'")
    expect(sql).toContain("engine = 'v2.1'")
    expect(sql).toContain("status IN ('pending', 'in_progress')")
    expect(sql).toContain("status = 'abandoned'")
    expect(sql).toContain('FOR UPDATE OF i SKIP LOCKED')
    expect(sql).toContain('RETURNING i.id, i.user_id')
    expect(sql).not.toMatch(/credits_remaining|credit_transactions|refund/i)
    expect(sql).not.toMatch(/INSERT\s+INTO\s+.*product_events/i)
    expect(sql).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.abandon_stale_active_interviews()')
    expect(sql).toContain('FROM PUBLIC, anon, authenticated')
    expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.abandon_stale_active_interviews()')
    expect(sql).toContain('TO service_role')
  })

  it('keeps stale predicate on authoritative UPDATE and only returns transitioned rows', () => {
    const updateAt = sql.indexOf('UPDATE public.interviews AS i')
    expect(updateAt).toBeGreaterThan(-1)
    const updateBlock = sql.slice(updateAt, sql.indexOf('END;', updateAt))
    expect(updateBlock).toContain('public.interview_last_activity_at(i.id) < v_stale_before')
    expect(updateBlock).toContain("i.status IN ('pending', 'in_progress')")
    expect(updateBlock).toContain("i.engine = 'v2.1'")
    expect(updateBlock).toContain("status = 'abandoned'")
    expect(updateBlock).toContain('RETURNING i.id, i.user_id')
    // Completed / already-abandoned are excluded by the status predicate (SET may assign abandoned).
    expect(updateBlock).not.toContain("'completed'")
    expect(updateBlock).toContain("i.status IN ('pending', 'in_progress')")
  })
})
