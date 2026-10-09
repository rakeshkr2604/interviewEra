import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FakeDb } from '@/test-utils/supabase-fake'
import { makeFakeServiceClient } from '@/test-utils/supabase-fake'

vi.mock('server-only', () => ({}))

const afterMock = vi.fn((cb: () => void) => {
  cb()
})

const trySendMock = vi.fn(async () => ({
  attempted: true,
  sent: true,
}))

const waitForScoredMock = vi.fn(async () => 1)
const retentionMock = vi.fn(async () => ({
  sessionLogged: true,
  qualityMet: true,
}))

const persistMilestoneEventOnce = vi.fn()

vi.mock('next/server', () => ({
  after: (cb: () => void) => afterMock(cb),
}))

vi.mock('@/lib/email/lifecycle/try-send-script-completion-email', () => ({
  trySendScriptCompletionEmail: (...args: unknown[]) => trySendMock(...args),
  waitForScoredEvaluations: (...args: unknown[]) => waitForScoredMock(...args),
}))

vi.mock('@/lib/retention/process-interview-complete', () => ({
  processInterviewRetentionSafely: (...args: unknown[]) => retentionMock(...args),
}))

vi.mock('@/lib/analytics/milestone-events-store', () => ({
  persistMilestoneEventOnce: (...args: unknown[]) => persistMilestoneEventOnce(...args),
}))

import { completeScriptInterviewFromTurn } from '@/lib/interview/complete-script-interview-from-turn'

const IV = '11111111-1111-1111-1111-111111111111'

describe('completeScriptInterviewFromTurn — race-safe completion', () => {
  let db: FakeDb

  beforeEach(() => {
    afterMock.mockClear()
    trySendMock.mockClear()
    waitForScoredMock.mockClear()
    retentionMock.mockClear()
    persistMilestoneEventOnce.mockClear()
    trySendMock.mockResolvedValue({ attempted: true, sent: true })
    waitForScoredMock.mockResolvedValue(1)
    retentionMock.mockResolvedValue({ sessionLogged: true, qualityMet: true })
    db = {
      interviews: [
        {
          id: IV,
          user_id: 'user-1',
          status: 'in_progress',
          current_turn_index: 0,
        },
      ],
    }
  })

  it('active → completed: emits interview_completed once and queues email', async () => {
    const result = await completeScriptInterviewFromTurn({
      serviceClient: makeFakeServiceClient(db) as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'candidate@example.com',
      currentTurnIndex: 12,
      performanceBucket: 'average',
    })

    expect(result).toEqual({ ok: true, transitioned: true })
    expect(db.interviews[0].status).toBe('completed')
    expect(db.interviews[0].current_turn_index).toBe(12)
    expect(persistMilestoneEventOnce).toHaveBeenCalledTimes(1)
    expect(persistMilestoneEventOnce).toHaveBeenCalledWith('interview_completed', {
      user_id: 'user-1',
      interview_id: IV,
      engine: 'v2.1',
    })
    // Retention after() + completion-email after()
    expect(afterMock).toHaveBeenCalledTimes(2)
    await vi.waitFor(() => {
      expect(waitForScoredMock).toHaveBeenCalled()
      expect(retentionMock).toHaveBeenCalledWith('user-1', IV)
      expect(trySendMock).toHaveBeenCalledTimes(1)
    })
  })

  it('abandoned interview: remains abandoned and does not emit interview_completed', async () => {
    db.interviews[0].status = 'abandoned'
    db.interviews[0].completed_at = '2026-09-24T12:00:00.000Z'

    const result = await completeScriptInterviewFromTurn({
      serviceClient: makeFakeServiceClient(db) as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'candidate@example.com',
      currentTurnIndex: 12,
    })

    expect(result.ok).toBe(false)
    expect(db.interviews[0].status).toBe('abandoned')
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
    expect(afterMock).not.toHaveBeenCalled()
  })

  it('zero affected rows (race equivalent): does not emit and does not report success', async () => {
    // Simulate PostgREST success with empty return (no active row matched).
    const serviceClient = {
      from: () => ({
        update: () => ({
          eq: () => ({
            in: () => ({
              select: async () => ({ data: [], error: null }),
            }),
          }),
        }),
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { status: 'abandoned' }, error: null }),
          }),
        }),
      }),
    }

    const result = await completeScriptInterviewFromTurn({
      serviceClient: serviceClient as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'a@b.co',
      currentTurnIndex: 5,
    })

    expect(result.ok).toBe(false)
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
    expect(afterMock).not.toHaveBeenCalled()
  })

  it('already completed concurrent winner: ok without re-emitting milestone', async () => {
    db.interviews[0].status = 'completed'

    const result = await completeScriptInterviewFromTurn({
      serviceClient: makeFakeServiceClient(db) as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'a@b.co',
      currentTurnIndex: 9,
    })

    expect(result).toEqual({ ok: true, transitioned: false })
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
    expect(afterMock).not.toHaveBeenCalled()
  })

  it('does not emit when the status update errors', async () => {
    const serviceClient = {
      from: () => ({
        update: () => ({
          eq: () => ({
            in: () => ({
              select: async () => ({ data: null, error: { message: 'db down' } }),
            }),
          }),
        }),
      }),
    }

    const result = await completeScriptInterviewFromTurn({
      serviceClient: serviceClient as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'a@b.co',
      currentTurnIndex: 5,
    })

    expect(result.ok).toBe(false)
    expect(persistMilestoneEventOnce).not.toHaveBeenCalled()
  })

  it('completion succeeds even when milestone emit throws', async () => {
    persistMilestoneEventOnce.mockImplementationOnce(() => {
      throw new Error('analytics down')
    })

    const result = await completeScriptInterviewFromTurn({
      serviceClient: makeFakeServiceClient(db) as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'c@d.co',
      currentTurnIndex: 3,
    })

    expect(result).toEqual({ ok: true, transitioned: true })
    expect(db.interviews[0].status).toBe('completed')
    expect(afterMock).toHaveBeenCalledTimes(2)
  })

  it('pending → completed also emits once', async () => {
    db.interviews[0].status = 'pending'
    const result = await completeScriptInterviewFromTurn({
      serviceClient: makeFakeServiceClient(db) as never,
      interviewId: IV,
      userId: 'user-1',
      recipientEmail: 'a@b.co',
      currentTurnIndex: 1,
    })
    expect(result).toEqual({ ok: true, transitioned: true })
    expect(persistMilestoneEventOnce).toHaveBeenCalledTimes(1)
  })
})
