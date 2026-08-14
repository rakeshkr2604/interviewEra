import { describe, expect, it } from 'vitest'
import { composeSpokenAnswer, resolveSubmitAnswer } from './submit-answer-source'

describe('composeSpokenAnswer', () => {
  it('15: includes the latest interim after the finalized text', () => {
    expect(composeSpokenAnswer('I built the parser.', 'and shipped it Friday')).toBe(
      'I built the parser. and shipped it Friday',
    )
  })

  it('normalizes whitespace only at the boundary', () => {
    expect(composeSpokenAnswer('  hello   world ', '  again  ')).toBe('hello world again')
  })

  it('does not duplicate an interim that echoes the finalized tail', () => {
    expect(composeSpokenAnswer('I built the parser', 'i built the parser')).toBe(
      'I built the parser',
    )
  })

  it('interim-only capture still submits', () => {
    expect(composeSpokenAnswer('', 'first words spoken')).toBe('first words spoken')
  })
})

describe('resolveSubmitAnswer', () => {
  it('15: voice mode prefers spoken (final + interim) over lagging answerText', () => {
    expect(
      resolveSubmitAnswer({
        spokenFinal: 'I built the parser.',
        spokenInterim: 'and it works',
        typedAnswer: 'I built the parser.', // stale sync (missing interim)
        micFallbackActive: false,
      }),
    ).toBe('I built the parser. and it works')
  })

  it('16: empty STT falls back to typed answerText', () => {
    expect(
      resolveSubmitAnswer({
        spokenFinal: '',
        spokenInterim: '',
        typedAnswer: 'Typed my whole answer here.',
        micFallbackActive: false,
      }),
    ).toBe('Typed my whole answer here.')
  })

  it('mic fallback: visible typed text wins over a stale spoken fragment', () => {
    expect(
      resolveSubmitAnswer({
        spokenFinal: 'partial words before mic died',
        spokenInterim: '',
        typedAnswer: 'Full typed answer after fallback.',
        micFallbackActive: true,
      }),
    ).toBe('Full typed answer after fallback.')
  })

  it('mic fallback with no typed text still uses the earlier spoken capture', () => {
    expect(
      resolveSubmitAnswer({
        spokenFinal: 'spoken before fallback',
        spokenInterim: '',
        typedAnswer: '',
        micFallbackActive: true,
      }),
    ).toBe('spoken before fallback')
  })

  it('everything empty resolves to empty string (caller guards submit)', () => {
    expect(
      resolveSubmitAnswer({
        spokenFinal: '',
        spokenInterim: ' ',
        typedAnswer: '  ',
        micFallbackActive: false,
      }),
    ).toBe('')
  })
})
