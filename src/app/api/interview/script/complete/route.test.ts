import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeDb } from '@/test-utils/supabase-fake'
import { makeFakeServiceClient } from '@/test-utils/supabase-fake'

const USER = { id: 'user-1', email: 'u@example.com' }
const IV = '11111111-1111-4111-8111-111111111111'

const afterMock = vi.fn((cb: () => void) => {
  cb()
})

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: (cb: () => void) => afterMock(cb),
  }
})

let db: FakeDb

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: USER }, error: null }) },
  }),
  createServiceClient: () => makeFakeServiceClient(db),
}))

const trySendMock = vi.fn(async () => ({ attempted: true, sent: true }))
vi.mock('@/lib/email/lifecycle/try-send-script-completion-email', () => ({
  trySendScriptCompletionEmail: (...args: unknown[]) => trySendMock(...args),
}))

vi.mock('@/lib/email/lifecycle/log', () => ({
  wasLifecycleEmailSent: vi.fn(async () => true),
}))

const persistMilestoneEventOnce = vi.fn()
vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: (...args: unknown[]) => persistMilestoneEventOnce(...args),
}))

import { PATCH } from '@/app/api/interview/script/complete/route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/interview/script/complete', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  afterMock.mockClear()
  trySendMock.mockClear()
  persistMilestoneEventOnce.mockClear()
  db = {
    interviews: [
      {
        id: IV,
        user_id: USER.id,
        engine: 'v2.1',
        status: 'in_progress',
        started_at: '2026-09-01T00:00:00Z',
      },
    ],
  }
})

describe('PATCH /api/interview/script/complete', () => {
  it('marks completed and emits durable interview_completed', async () => {
    const res = await PATCH(
      req({ interviewId: IV, performanceBucket: 'average' }),
    )
    expect(res.status).toBe(200)
    expect(db.interviews[0].status).toBe('completed')
    expect(persistMilestoneEventOnce).toHaveBeenCalledTimes(1)
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_completed', {
      user_id: USER.id,
      interview_id: IV,
      engine: 'v2.1',
    })
  })

  it('already-completed repair emits interview_completed (052 dedupe)', async () => {
    db.interviews[0].status = 'completed'
    const res = await PATCH(
      req({ interviewId: IV, performanceBucket: 'strong' }),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.alreadyCompleted).toBe(true)
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_completed', {
      user_id: USER.id,
      interview_id: IV,
      engine: 'v2.1',
    })
  })

  it('does not complete or emit interview_completed for abandoned rows', async () => {
    db.interviews[0].status = 'abandoned'
    const res = await PATCH(
      req({ interviewId: IV, performanceBucket: 'average' }),
    )
    expect(res.status).toBe(400)
    expect(db.interviews[0].status).toBe('abandoned')
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
  })

  it('completion succeeds when milestone emit throws', async () => {
    persistMilestoneEventOnce.mockImplementationOnce(() => {
      throw new Error('analytics down')
    })
    const res = await PATCH(
      req({ interviewId: IV, performanceBucket: 'low' }),
    )
    expect(res.status).toBe(200)
    expect(db.interviews[0].status).toBe('completed')
  })
})
