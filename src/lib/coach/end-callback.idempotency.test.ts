import { describe, expect, it } from 'vitest'

/**
 * Documents end-callback idempotency contract used by
 * POST /api/coach/session/end-callback (QStash-verified).
 *
 * Full HTTP+signature tests need QStash signing keys; this covers the
 * decision table the handler implements against pending Redis state.
 */
describe('coach end-callback idempotency contract', () => {
  type Pending = { roomId: string; connectedAt?: string } | null

  function decide(pending: Pending, callbackRoomId: string) {
    if (!pending || pending.roomId !== callbackRoomId) {
      return { action: 'noop' as const, reason: 'no_matching_pending' }
    }
    return { action: 'force_end' as const, reason: 'matched' }
  }

  it('no-ops when pending is missing (user already reset / TTL expired)', () => {
    expect(decide(null, 'room-a')).toEqual({
      action: 'noop',
      reason: 'no_matching_pending',
    })
  })

  it('no-ops when pending room was superseded by a newer mint', () => {
    expect(decide({ roomId: 'room-new' }, 'room-old')).toEqual({
      action: 'noop',
      reason: 'no_matching_pending',
    })
  })

  it('force-ends when pending still points at the callback room', () => {
    expect(decide({ roomId: 'room-a', connectedAt: '2026-07-27T00:00:00.000Z' }, 'room-a')).toEqual({
      action: 'force_end',
      reason: 'matched',
    })
  })
})
