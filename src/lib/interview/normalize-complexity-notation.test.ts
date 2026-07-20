import { describe, expect, it } from 'vitest'
import { normalizeComplexityNotation } from './normalize-complexity-notation'

describe('normalizeComplexityNotation', () => {
  it('normalizes big o n log n (confirmed DB pattern)', () => {
    const raw =
      'With randomized pivot selection, the expected time complex is big O n log n because a random pivot'
    expect(normalizeComplexityNotation(raw)).toContain('O(n log n)')
    expect(normalizeComplexityNotation(raw)).not.toMatch(/\bbig\s*o\s*n\s*log\s*n\b/i)
  })

  it('normalizes big o of n / big o n', () => {
    expect(normalizeComplexityNotation('That has time complexity of approximately big o of n.')).toBe(
      'That has time complexity of approximately O(n).',
    )
    expect(normalizeComplexityNotation('full table scan is big o n')).toBe(
      'full table scan is O(n)',
    )
  })

  it('normalizes o n squared', () => {
    expect(normalizeComplexityNotation('worst case is o n squared for nested loops')).toBe(
      'worst case is O(n^2) for nested loops',
    )
    expect(normalizeComplexityNotation('big o n squared')).toBe('O(n^2)')
  })

  it('normalizes o n log n without big prefix', () => {
    expect(normalizeComplexityNotation('average is o n log n in practice')).toBe(
      'average is O(n log n) in practice',
    )
  })

  it('does not alter unrelated text (false-positive safety)', () => {
    const sentences = [
      'I went to the store on Monday and then came home.',
      'The API returns JSON for each request.',
      'No questions from me today.',
      'We use React and Node.js on the backend.',
      'In conclusion I am ready for the role.',
    ]
    for (const s of sentences) {
      expect(normalizeComplexityNotation(s)).toBe(s)
    }
  })

  it('does not rewrite already-correct notation', () => {
    const good = 'B-tree indexes provide approximately O(log n) search.'
    expect(normalizeComplexityNotation(good)).toBe(good)
  })

  it('leaves ambiguous partial phrases untouched', () => {
    // "on" / "no" — must not become O(n)
    expect(normalizeComplexityNotation('turn on the light')).toBe('turn on the light')
    expect(normalizeComplexityNotation('no problem at all')).toBe('no problem at all')
  })
})
