import { beforeEach, describe, expect, it, vi } from 'vitest'

const wasSentMock = vi.hoisted(() => vi.fn())
const trySendMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/email/lifecycle/log', () => ({
  wasLifecycleEmailSent: (...args: unknown[]) => wasSentMock(...args),
}))

vi.mock('@/lib/email/lifecycle/try-send-script-completion-email', () => ({
  reportHasEmailableScores: (report: {
    overall: number | null
    dimension_averages: unknown
    scored_answer_count: number
  }) =>
    report.overall != null &&
    Boolean(report.dimension_averages) &&
    report.scored_answer_count > 0,
  trySendScriptCompletionEmail: (...args: unknown[]) => trySendMock(...args),
}))

import { sendOwedScriptCompletionEmailIfReportReady } from '@/lib/email/lifecycle/send-owed-script-completion-email'

/**
 * Locks the Phase 1b close-out fix: when a completion email was skipped for
 * insufficient_report, a later emailable report triggers a re-send.
 */
describe('Phase 1b — owed completion email after report readiness', () => {
  beforeEach(() => {
    wasSentMock.mockReset()
    trySendMock.mockReset()
  })

  function makeClient(email: string | null) {
    return {
      from: (table: string) => {
        expect(table).toBe('users')
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: email ? { email } : null,
                error: null,
              }),
            }),
          }),
        }
      },
    }
  }

  const emailableReport = {
    overall: 7.2,
    dimension_averages: { clarity: 7 },
    scored_answer_count: 3,
    status: 'ready' as const,
  }

  const insufficientReport = {
    overall: null,
    dimension_averages: null,
    scored_answer_count: 0,
    status: 'insufficient_data' as const,
  }

  it('does not send when report is still insufficient (the skip gap case)', async () => {
    wasSentMock.mockResolvedValue(false)
    const result = await sendOwedScriptCompletionEmailIfReportReady({
      serviceClient: makeClient('c@example.com') as never,
      interviewId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      userId: 'user-1',
      report: insufficientReport,
    })
    expect(result.skippedReason).toBe('report_not_emailable')
    expect(trySendMock).not.toHaveBeenCalled()
  })

  it('re-sends once the report becomes emailable and no prior send exists', async () => {
    wasSentMock.mockResolvedValue(false)
    trySendMock.mockResolvedValue({ attempted: true, sent: true })

    const result = await sendOwedScriptCompletionEmailIfReportReady({
      serviceClient: makeClient('c@example.com') as never,
      interviewId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      userId: 'user-1',
      report: emailableReport,
    })

    expect(trySendMock).toHaveBeenCalledTimes(1)
    expect(trySendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        interviewId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        recipientEmail: 'c@example.com',
        waitForScores: false,
        skipReportLoadSideEffects: true,
      }),
    )
    expect(result).toEqual({ attempted: true, sent: true })
  })

  it('does not duplicate when lifecycle log already has a successful send', async () => {
    wasSentMock.mockResolvedValue(true)
    const result = await sendOwedScriptCompletionEmailIfReportReady({
      serviceClient: makeClient('c@example.com') as never,
      interviewId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      userId: 'user-1',
      report: emailableReport,
    })
    expect(result.skippedReason).toBe('already_sent')
    expect(trySendMock).not.toHaveBeenCalled()
  })
})
