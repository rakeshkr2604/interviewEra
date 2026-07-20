import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  _resetBootTurnApplyClaimsForTests,
  _resetBootTurnRegistryForTests,
  claimBootTurnApply,
  clearBootTurnFetch,
  decideBootTurnFetch,
  getBootTurnPromise,
  getBootTurnResult,
  hasBootTurnApplyClaim,
  registerBootTurnFetch,
  releaseBootTurnApplyClaim,
  resolveBootTurnSource,
  shouldFallbackLoadFirstTurn,
} from './script-boot-guard'

afterEach(() => {
  _resetBootTurnApplyClaimsForTests()
  _resetBootTurnRegistryForTests()
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

describe('resolveBootTurnSource', () => {
  it('starts a fetch on cold boot', () => {
    expect(
      resolveBootTurnSource({
        decision: { action: 'fetch_first_turn' },
        interviewId: 'i1',
        hasRegisteredPromise: false,
      }),
    ).toBe('start_fetch')
  })

  it('joins existing promise on skip_already_booted when registered', () => {
    expect(
      resolveBootTurnSource({
        decision: { action: 'skip_already_booted' },
        interviewId: 'i1',
        hasRegisteredPromise: true,
      }),
    ).toBe('join_existing')
  })

  it('returns none on skip_already_booted with nothing registered', () => {
    expect(
      resolveBootTurnSource({
        decision: { action: 'skip_already_booted' },
        interviewId: 'i1',
        hasRegisteredPromise: false,
      }),
    ).toBe('none')
  })
})

describe('boot turn registry — Strict Mode hang fix', () => {
  it('shares one fetch across concurrent callers (no duplicate startFetch)', async () => {
    const startFetch = vi.fn(async () => ({ turnIndex: 1, speech: 'Hello' }))
    const p1 = registerBootTurnFetch('race-1', startFetch)
    const p2 = registerBootTurnFetch('race-1', startFetch)
    expect(p1).toBe(p2)
    expect(startFetch).toHaveBeenCalledTimes(1)
    await expect(p1).resolves.toEqual({ turnIndex: 1, speech: 'Hello' })
  })

  it('keeps the settled result after the first await so a remount can still consume it', async () => {
    const payload = { turnIndex: 1, interviewId: 'race-2', speech: 'Warmup' }
    let resolveFetch!: (v: typeof payload) => void
    const slow = new Promise<typeof payload>((resolve) => {
      resolveFetch = resolve
    })

    const startFetch = vi.fn(() => slow)
    const first = registerBootTurnFetch('race-2', startFetch)

    // Simulate mount-1 cancelled mid-flight while fetch still pending.
    let mount1Applied = false
    const mount1 = (async () => {
      const cancelled = true
      const value = await first
      if (cancelled) return // discarded — the hang before the fix
      mount1Applied = true
      void value
    })()

    // Mount-2 joins the same registry entry (even after settle).
    const joined = getBootTurnPromise<typeof payload>('race-2')
    expect(joined).not.toBeNull()
    expect(joined).toBe(first)

    resolveFetch(payload)
    await mount1
    expect(mount1Applied).toBe(false)

    // Promise already settled — registry must still expose it.
    await expect(joined!).resolves.toEqual(payload)
    expect(getBootTurnResult('race-2')).toEqual(payload)
    expect(startFetch).toHaveBeenCalledTimes(1)
  })

  it('exactly-once apply under cancelled-first + surviving-second race', async () => {
    const payload = { turnIndex: 1, interviewId: 'race-3' }
    let resolveFetch!: (v: typeof payload) => void
    const slow = new Promise<typeof payload>((resolve) => {
      resolveFetch = resolve
    })

    const startFetch = vi.fn(() => slow)
    const shared = registerBootTurnFetch('race-3', startFetch)

    const applyCalls: unknown[] = []
    const applyOnce = (data: unknown) => {
      if (!claimBootTurnApply('race-3')) return false
      clearBootTurnFetch('race-3')
      applyCalls.push(data)
      return true
    }

    // Mount 1: cancelled after await — must not apply.
    const mount1 = (async () => {
      const cancelled = true
      const value = await shared
      if (cancelled) return
      applyOnce(value)
    })()

    // Mount 2: joins existing, awaits, applies.
    const mount2 = (async () => {
      const source = resolveBootTurnSource({
        decision: decideBootTurnFetch({ needsUnlock: false, bootAlreadyCalled: true }),
        interviewId: 'race-3',
        hasRegisteredPromise: Boolean(getBootTurnPromise('race-3')),
      })
      expect(source).toBe('join_existing')
      const value = await getBootTurnPromise<typeof payload>('race-3')
      expect(value).toEqual(payload)
      applyOnce(value)
    })()

    resolveFetch(payload)
    await Promise.all([mount1, mount2])

    expect(startFetch).toHaveBeenCalledTimes(1)
    expect(applyCalls).toHaveLength(1)
    expect(applyCalls[0]).toEqual(payload)
    expect(hasBootTurnApplyClaim('race-3')).toBe(true)
    expect(getBootTurnPromise('race-3')).toBeNull()
  })

  it('clears registry on rejection so a retry can start a new fetch', async () => {
    const startFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('llm_timeout'))
      .mockResolvedValueOnce({ turnIndex: 1 })

    await expect(registerBootTurnFetch('race-4', startFetch)).rejects.toThrow('llm_timeout')
    // Rejection clears the entry.
    expect(getBootTurnPromise('race-4')).toBeNull()

    await expect(registerBootTurnFetch('race-4', startFetch)).resolves.toEqual({ turnIndex: 1 })
    expect(startFetch).toHaveBeenCalledTimes(2)
  })
})
