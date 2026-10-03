/**
 * Concurrency test: multiple simultaneous sendLifecycleTemplate calls for the
 * same idempotencyKey must call Resend exactly once.
 *
 * Simulates the production unique index on lifecycle_email_log(idempotency_key)
 * WHERE status='sent' with an in-memory store + serialized insert chain.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

type LogRow = {
  id: string
  idempotency_key: string
  status: 'sent' | 'failed'
  provider_message_id: string | null
  error_message: string | null
  sent_at: string
}

const store = vi.hoisted(() => ({
  rows: [] as LogRow[],
  /** Serialize claim inserts like a DB unique constraint under concurrency. */
  insertChain: Promise.resolve() as Promise<void>,
}))

const sendEmailMock = vi.hoisted(() => vi.fn())
const renderMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/email/send', () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}))

vi.mock('@/lib/email/templates/render-template.server', () => ({
  renderEmailTemplate: (...args: unknown[]) => renderMock(...args),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      expect(table).toBe('lifecycle_email_log')
      return {
        select: () => ({
          eq: (col1: string, val1: string) => ({
            eq: (col2: string, val2: string) => ({
              maybeSingle: async () => {
                const matched = store.rows.find((r) => {
                  const a = col1 === 'idempotency_key' ? r.idempotency_key === val1 : r.status === val1
                  const b = col2 === 'status' ? r.status === val2 : r.idempotency_key === val2
                  return a && b
                })
                return { data: matched ?? null, error: null }
              },
            }),
          }),
        }),
        insert: (payload: Record<string, unknown>) => {
          const run = async () => {
            if (
              payload.status === 'sent' &&
              store.rows.some(
                (r) =>
                  r.idempotency_key === payload.idempotency_key && r.status === 'sent',
              )
            ) {
              return {
                data: null as LogRow | null,
                error: {
                  code: '23505',
                  message:
                    'duplicate key value violates unique constraint "idx_lifecycle_email_sent_idempotency"',
                },
              }
            }
            const row: LogRow = {
              id: `claim-${store.rows.length + 1}-${Math.random().toString(36).slice(2, 8)}`,
              idempotency_key: String(payload.idempotency_key),
              status: payload.status as 'sent' | 'failed',
              provider_message_id: (payload.provider_message_id as string | null) ?? null,
              error_message: (payload.error_message as string | null) ?? null,
              sent_at: new Date().toISOString(),
            }
            store.rows.push(row)
            return { data: row, error: null as null }
          }

          const resultPromise = store.insertChain.then(run, run)
          store.insertChain = resultPromise.then(
            () => undefined,
            () => undefined,
          )

          return {
            select: () => ({
              single: async () => {
                const result = await resultPromise
                if (result.error) return { data: null, error: result.error }
                return { data: { id: result.data!.id }, error: null }
              },
            }),
          }
        },
        update: (payload: Record<string, unknown>) => ({
          eq: async (_col: string, val: string) => {
            const row = store.rows.find((r) => r.id === val)
            if (!row) return { error: { message: 'not found' } }
            if (payload.status != null) row.status = payload.status as 'sent' | 'failed'
            if ('provider_message_id' in payload) {
              row.provider_message_id = payload.provider_message_id as string | null
            }
            if ('error_message' in payload) {
              row.error_message = payload.error_message as string | null
            }
            return { error: null }
          },
        }),
      }
    },
  }),
}))

import { sendLifecycleTemplate } from '@/lib/email/lifecycle/send-template'

describe('sendLifecycleTemplate — claim-before-send concurrency', () => {
  beforeEach(() => {
    store.rows = []
    store.insertChain = Promise.resolve()
    sendEmailMock.mockReset()
    renderMock.mockReset()
    process.env.RESEND_API_KEY = 'test-key'

    renderMock.mockResolvedValue({
      html: '<p>hi</p>',
      subject: 'Interview complete',
    })
    sendEmailMock.mockImplementation(async () => {
      // Latency so claims race before send completes.
      await new Promise((r) => setTimeout(r, 30))
      return { success: true, id: `resend_${Math.random().toString(36).slice(2, 10)}` }
    })
  })

  it('calls Resend exactly once when four concurrent triggers share one idempotency key', async () => {
    const key = 'script_interview_completed:test-interview-race'
    const input = {
      template: 'interview_completed' as const,
      to: 'candidate@example.com',
      userId: 'user-1',
      idempotencyKey: key,
      props: { overallScore: 72 },
      text: 'done',
    }

    const results = await Promise.all([
      sendLifecycleTemplate(input),
      sendLifecycleTemplate(input),
      sendLifecycleTemplate(input),
      sendLifecycleTemplate(input),
    ])

    expect(sendEmailMock).toHaveBeenCalledTimes(1)

    const sent = results.filter((r) => r.sent)
    const skipped = results.filter((r) => r.skipped)
    expect(sent).toHaveLength(1)
    expect(skipped).toHaveLength(3)

    const confirmed = store.rows.filter(
      (r) => r.status === 'sent' && Boolean(r.provider_message_id),
    )
    expect(confirmed).toHaveLength(1)
    expect(confirmed[0].error_message).toBeNull()
  })

  it('releases the claim on Resend failure so a later attempt can send once', async () => {
    const key = 'script_interview_completed:retry-after-fail'
    const input = {
      template: 'interview_completed' as const,
      to: 'candidate@example.com',
      userId: 'user-1',
      idempotencyKey: key,
      props: { overallScore: 72 },
    }

    sendEmailMock.mockResolvedValueOnce({ success: false, error: 'resend_down' })
    const first = await sendLifecycleTemplate(input)
    expect(first.sent).toBe(false)
    expect(first.skipped).toBe(false)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    expect(store.rows.some((r) => r.status === 'sent')).toBe(false)

    sendEmailMock.mockResolvedValueOnce({ success: true, id: 'resend_ok' })
    const second = await sendLifecycleTemplate(input)
    expect(second.sent).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(2)
  })

  it('stuck claim (crash after claim, before Resend) permanently occupies sent slot', async () => {
    // Simulate claim insert without provider call: status=sent, claim_in_progress.
    store.rows.push({
      id: 'stuck-1',
      idempotency_key: 'interview_recovery:int-stuck:r1',
      status: 'sent',
      provider_message_id: null,
      error_message: 'claim_in_progress',
      sent_at: new Date().toISOString(),
    })

    const result = await sendLifecycleTemplate({
      template: 'interview_recovery' as const,
      to: 'candidate@example.com',
      userId: 'user-1',
      idempotencyKey: 'interview_recovery:int-stuck:r1',
      props: { roleLabel: 'SDE' },
    })

    expect(result.skipped).toBe(true)
    expect(result.sent).toBe(false)
    expect(sendEmailMock).not.toHaveBeenCalled()
    expect(store.rows.filter((r) => r.status === 'sent')).toHaveLength(1)
    expect(store.rows[0].error_message).toBe('claim_in_progress')
    expect(store.rows[0].provider_message_id).toBeNull()
  })

  it('provider accept without id confirms with unknown and blocks resend', async () => {
    sendEmailMock.mockResolvedValueOnce({ success: true, id: undefined })
    const key = 'interview_recovery:int-noid:r1'
    const first = await sendLifecycleTemplate({
      template: 'interview_recovery' as const,
      to: 'candidate@example.com',
      userId: 'user-1',
      idempotencyKey: key,
      props: { roleLabel: 'SDE' },
    })
    expect(first.sent).toBe(true)
    const confirmed = store.rows.find((r) => r.idempotency_key === key)
    expect(confirmed?.status).toBe('sent')
    expect(confirmed?.provider_message_id).toBe('unknown')
    expect(confirmed?.error_message).toBeNull()

    const second = await sendLifecycleTemplate({
      template: 'interview_recovery' as const,
      to: 'candidate@example.com',
      userId: 'user-1',
      idempotencyKey: key,
      props: { roleLabel: 'SDE' },
    })
    expect(second.skipped).toBe(true)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('does not auto-reset ambiguous sent+claim_in_progress (operator must not resend blindly)', async () => {
    store.rows.push({
      id: 'ambiguous-1',
      idempotency_key: 'interview_recovery:int-amb:r1',
      status: 'sent',
      provider_message_id: null,
      error_message: 'claim_in_progress',
      sent_at: new Date().toISOString(),
    })
    // Schema cannot tell "never sent" vs "sent then crash before confirm".
    // Recovery must not release this automatically.
    const again = await sendLifecycleTemplate({
      template: 'interview_recovery' as const,
      to: 'candidate@example.com',
      userId: 'user-1',
      idempotencyKey: 'interview_recovery:int-amb:r1',
      props: {},
    })
    expect(again.skipped).toBe(true)
    expect(store.rows[0].status).toBe('sent')
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})
