import { describe, expect, it } from 'vitest'
import {
  canOfferSkip,
  isSkipAnswer,
  skipsRemaining,
  skipsUsedAfterAnswer,
} from '@/lib/interview/skip-accounting'

describe('skip-accounting', () => {
  it('detects [SKIPPED] only', () => {
    expect(isSkipAnswer('[SKIPPED]')).toBe(true)
    expect(isSkipAnswer('[TIMEOUT]')).toBe(false)
    expect(isSkipAnswer('I skipped this')).toBe(false)
  })

  it('increments skips_used only on skip answers', () => {
    expect(skipsUsedAfterAnswer(0, '[SKIPPED]')).toBe(1)
    expect(skipsUsedAfterAnswer(1, '[SKIPPED]')).toBe(2)
    expect(skipsUsedAfterAnswer(1, 'real answer')).toBe(1)
    expect(skipsUsedAfterAnswer(1, '[TIMEOUT]')).toBe(1)
  })

  it('computes remaining skips without going negative', () => {
    expect(skipsRemaining(0, 2)).toBe(2)
    expect(skipsRemaining(2, 2)).toBe(0)
    expect(skipsRemaining(3, 2)).toBe(0)
  })

  it('hides Skip when budget is exhausted even if allow_skip is true', () => {
    expect(
      canOfferSkip({ allowSkip: true, skipsUsed: 1, maxSkips: 2 }),
    ).toBe(true)
    expect(
      canOfferSkip({ allowSkip: true, skipsUsed: 2, maxSkips: 2 }),
    ).toBe(false)
    expect(
      canOfferSkip({ allowSkip: false, skipsUsed: 0, maxSkips: 2 }),
    ).toBe(false)
  })
})
