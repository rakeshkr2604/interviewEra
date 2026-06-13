import { describe, expect, it } from 'vitest'
import { shouldSkipJdReparse } from '@/lib/onboarding/jd-parse-guard'

describe('shouldSkipJdReparse', () => {
  const minLen = 40
  const jd = 'A'.repeat(50)

  it('skips when hydrated draft matches parsed source', () => {
    expect(
      shouldSkipJdReparse({
        normalizedText: jd,
        minLen,
        parseStatus: 'ready',
        hasParsedJd: true,
        lastParsedSource: jd,
      }),
    ).toBe(true)
  })

  it('does not skip when text changed after parse', () => {
    expect(
      shouldSkipJdReparse({
        normalizedText: `${jd} updated`,
        minLen,
        parseStatus: 'ready',
        hasParsedJd: true,
        lastParsedSource: jd,
      }),
    ).toBe(false)
  })

  it('does not skip when parse never completed', () => {
    expect(
      shouldSkipJdReparse({
        normalizedText: jd,
        minLen,
        parseStatus: 'idle',
        hasParsedJd: false,
        lastParsedSource: null,
      }),
    ).toBe(false)
  })
})
