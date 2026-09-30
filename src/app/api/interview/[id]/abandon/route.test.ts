import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeDb } from '@/test-utils/supabase-fake'
import { makeFakeServiceClient } from '@/test-utils/supabase-fake'

const USER = { id: 'user-1', email: 'u@example.com' }
const IV = '11111111-1111-4111-8111-111111111111'

let db: FakeDb

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
  }),
  createServiceClient: () => makeFakeServiceClient(db),
}))

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
}))

const trackInterviewEvent = vi.fn()
vi.mock('@/lib/analytics/interview-events', () => ({
  trackInterviewEvent: (...args: unknown[]) => trackInterviewEvent(...args),
}))

const persistMilestoneEventOnce = vi.fn()
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: (...args: unknown[]) => persistMilestoneEventOnce(...args),
}))

import { POST } from '@/app/api/interview/[id]/abandon/route'

function params(id: string) {
  return Promise.resolve({ id })
}

beforeEach(() => {
  trackInterviewEvent.mockClear()
  persistMilestoneEventOnce.mockClear()
  db = {
    interviews: [
      {
        id: IV,
        user_id: USER.id,
        status: 'in_progress',
        started_at: '2026-09-01T00:00:00Z',
      },
    ],
  }
})

describe('POST /api/interview/[id]/abandon', () => {
  it('abandons and emits durable interview_abandoned exactly once', async () => {
    const res = await POST(new Request('http://localhost'), { params: params(IV) })
    expect(res.status).toBe(200)
    expect(db.interviews[0].status).toBe('abandoned')
    expect(db.interviews[0].completed_at).toBeTruthy()
    expect(persistMilestoneEventOnce).toHaveBeenCalledTimes(1)
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_abandoned', {
      user_id: USER.id,
      interview_id: IV,
      previous_status: 'in_progress',
    })
    expect(trackInterviewEvent).toHaveBeenCalledWith(
      'interview_abandoned',
      expect.objectContaining({ interviewId: IV }),
    )
  })

  it('idempotent abandon retry does not re-emit milestone', async () => {
    db.interviews[0].status = 'abandoned'
    const res = await POST(new Request('http://localhost'), { params: params(IV) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.idempotent).toBe(true)
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
  })

  it('completed interview cannot become abandoned', async () => {
    db.interviews[0].status = 'completed'
    const res = await POST(new Request('http://localhost'), { params: params(IV) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.status).toBe('completed')
    expect(json.idempotent).toBe(true)
    expect(db.interviews[0].status).toBe('completed')
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
  })

  it('abandon succeeds when milestone emit throws', async () => {
    persistMilestoneEventOnce.mockImplementationOnce(() => {
      throw new Error('analytics down')
    })
    const res = await POST(new Request('http://localhost'), { params: params(IV) })
    expect(res.status).toBe(200)
    expect(db.interviews[0].status).toBe('abandoned')
  })
})
