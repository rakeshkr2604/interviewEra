import { describe, expect, it } from 'vitest'
import {
  alignTranscriptDiff,
  applyReplaceSuggestion,
} from '@/lib/interview/corrected-transcript-guard'

/**
 * Component-level accept path (vitest include is *.test.ts only):
 * simulates editor acceptReplace(op) = applyReplaceSuggestion(value, op)
 * for the same ops the UI derives from alignTranscriptDiff.
 */
describe('ReviewAnswerHighlightEditor accept path', () => {
  it('accepting first then second highlight updates text like the UI chip would', () => {
    const raw = 'Superb base. Postgres SQL Kubernetes Jaconian,'
    const corrected = 'Supabase. Postgres SQL Kubernetes Jacoco,'

    let value = raw
    const acceptNextReplace = () => {
      const ops = alignTranscriptDiff(value, corrected)
      const next = ops.find((o) => o.type === 'replace')
      expect(next?.type).toBe('replace')
      if (next?.type !== 'replace') throw new Error('expected replace')
      value = applyReplaceSuggestion(value, next)
    }

    acceptNextReplace()
    expect(value).toBe('Supabase. Postgres SQL Kubernetes Jaconian,')

    acceptNextReplace()
    expect(value).toBe('Supabase. Postgres SQL Kubernetes Jacoco,')
  })

  it('accepts a candidate-typed spelling when the suggestion is wrong', () => {
    const raw = 'I studied at Saralabhilay college'
    const corrected = 'I studied at Sarlabhilay college'
    const ops = alignTranscriptDiff(raw, corrected)
    const replace = ops.find((o) => o.type === 'replace')
    expect(replace?.type).toBe('replace')
    if (replace?.type !== 'replace') throw new Error('expected replace')

    // LLM suggestion is still wrong — candidate types the real name.
    const next = applyReplaceSuggestion(raw, replace, 'Xavier')
    expect(next).toBe('I studied at Xavier college')
  })
})
