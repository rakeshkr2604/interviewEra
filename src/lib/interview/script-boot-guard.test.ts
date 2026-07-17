import { afterEach, describe, expect, it } from 'vitest'
import {
  _resetBootTurnApplyClaimsForTests,
  claimBootTurnApply,
  decideBootTurnFetch,
  releaseBootTurnApplyClaim,
  shouldFallbackLoadFirstTurn,
} from './script-boot-guard'

afterEach(() => {
  _resetBootTurnApplyClaimsForTests()
})

describe('decideBootTurnFetch', () => {
  it('fetches first turn on cold boot', () => {
    expect(
      decideBootTurnFetch({ needsUnlock: false, bootAlreadyCalled: false }),
    ).toEqual({ action: 'fetch_first_turn' })
  })

  it('skips when iOS unlock is required', () => {
    expect(
      decideBootTurnFetch({ needsUnlock: true, bootAlreadyCalled: false }),
    ).toEqual({ action: 'skip_await_unlock' })
  })

  it('skips re-entry when boot already called (router/effect churn)', () => {
    expect(
      decideBootTurnFetch({ needsUnlock: false, bootAlreadyCalled: true }),
    ).toEqual({ action: 'skip_already_booted' })
  })
})

describe('shouldFallbackLoadFirstTurn', () => {
  it('does not re-fetch [NONE] on boot re-entry with null turn', () => {
    expect(
      shouldFallbackLoadFirstTurn({
        needsUnlock: false,
        bootCalled: true,
        turnResult: null,
        cancelled: false,
      }),
    ).toBe(false)
  })

  it('allows fallback only when boot never marked and turn missing', () => {
    expect(
      shouldFallbackLoadFirstTurn({
        needsUnlock: false,
        bootCalled: false,
        turnResult: null,
        cancelled: false,
      }),
    ).toBe(true)
  })

  it('never falls back when cancelled', () => {
    expect(
      shouldFallbackLoadFirstTurn({
        needsUnlock: false,
        bootCalled: false,
        turnResult: null,
        cancelled: true,
      }),
    ).toBe(false)
  })
})

describe('claimBootTurnApply', () => {
  it('allows only one apply/speak claim per interview (double-invocation)', () => {
    expect(claimBootTurnApply('int-1')).toBe(true)
    expect(claimBootTurnApply('int-1')).toBe(false)
    expect(claimBootTurnApply('int-1')).toBe(false)
    expect(claimBootTurnApply('int-2')).toBe(true)
  })

  it('release allows a deliberate retry after failed boot', () => {
    expect(claimBootTurnApply('int-3')).toBe(true)
    releaseBootTurnApplyClaim('int-3')
    expect(claimBootTurnApply('int-3')).toBe(true)
  })
})
