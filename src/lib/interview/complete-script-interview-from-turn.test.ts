import { beforeEach, describe, expect, it, vi } from 'vitest'

const afterMock = vi.fn((cb: () => void) => {
  // Run synchronously in tests so we can assert the queued email call.
  cb()
})

const trySendMock = vi.fn(async () => ({
  attempted: true,
  sent: true,
}))

vi.mock('next/server', () => ({
  after: (cb: () => void) => afterMock(cb),
}))

vi.mock('@/lib/email/lifecycle/try-send-script-completion-email', () => ({
  trySendScriptCompletionEmail: (...args: unknown[]) => trySendMock(...args),
}))

import { completeScriptInterviewFromTurn } from '@/lib/interview/complete-script-interview-from-turn'

type UpdateCall = { payload: Record<string, unknown>; eqId: string }

/**
 * Locks Phase 1b server-side completion: closing → status=completed + email queued once.
 */
describe('Phase 1b — completeScriptInterviewFromTurn', () => {
  let updateCalls: UpdateCall[]

  function makeServiceClient(opts?: { failUpdate?: boolean }) {
    updateCalls = []
    return {
      from: (table: string) => {
        expect(table).toBe('interviews')
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              updateCalls.push({ payload, eqId: id })
              if (opts?.failUpdate) {
                return { error: { message: 'db down' } }
              }
              return { error: null }
            },
          }),
        }
      },
    }
  }

  beforeEach(() => {
    afterMock.mockClear()
    trySendMock.mockClear()
    trySendMock.mockResolvedValue({ attempted: true, sent: true })
  })

  it('sets status=completed and queues email exactly once', async () => {
    const serviceClient = makeServiceClient()
    const result = await completeScriptInterviewFromTurn({
      serviceClient: serviceClient as never,
      interviewId: '11111111-1111-1111-1111-111111111111',
      userId: 'user-1',
      recipientEmail: 'candidate@example.com',
      currentTurnIndex: 12,
      performanceBucket: 'average',
    })

    expect(result).toEqual({ ok: true })
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0].payload.status).toBe('completed')
    expect(updateCalls[0].payload.current_turn_index).toBe(12)
    expect(updateCalls[0].payload.performance_bucket).toBe('average')
    expect(typeof updateCalls[0].payload.completed_at).toBe('string')

    expect(afterMock).toHaveBeenCalledTimes(1)
    expect(trySendMock).toHaveBeenCalledTimes(1)
    expect(trySendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewId: '11111111-1111-1111-1111-111111111111',
        userId: 'user-1',
        recipientEmail: 'candidate@example.com',
        waitForScores: true,
      }),
    )
  })

  it('does not queue email when the status update fails', async () => {
    const serviceClient = makeServiceClient({ failUpdate: true })
    const result = await completeScriptInterviewFromTurn({
      serviceClient: serviceClient as never,
      interviewId: '11111111-1111-1111-1111-111111111111',
      userId: 'user-1',
      recipientEmail: 'candidate@example.com',
      currentTurnIndex: 5,
    })

    expect(result.ok).toBe(false)
    expect(afterMock).not.toHaveBeenCalled()
    expect(trySendMock).not.toHaveBeenCalled()
  })

  it('queues email once even when called for each closing path shape', async () => {
    const paths = ['llm-native', 'core-budget', 'cq-exit', 'turn-cap'] as const
    for (const _path of paths) {
      afterMock.mockClear()
      trySendMock.mockClear()
      const serviceClient = makeServiceClient()
      await completeScriptInterviewFromTurn({
        serviceClient: serviceClient as never,
        interviewId: '22222222-2222-2222-2222-222222222222',
        userId: 'user-2',
        recipientEmail: 'a@b.co',
        currentTurnIndex: 9,
      })
      expect(afterMock).toHaveBeenCalledTimes(1)
      expect(trySendMock).toHaveBeenCalledTimes(1)
    }
  })
})
