import { describe, expect, it } from 'vitest'
import {
  alignTranscriptDiff,
  applyReplaceSuggestion,
  guardCorrectedTranscript,
  isAllowedSubstitution,
  isAllowedTechOrProperNoun,
  sharesInflectionStem,
  tokenizeWords,
  wordDiffOps,
} from '@/lib/interview/corrected-transcript-guard'

const SMOKE_RAW =
  'so in my last project I used super a base for the data store and connect it with next jay es api routes then I store the user session in cookies and also used react query for caching'

const SMOKE_BLEED =
  'So in my last project I used Supabase for the data store and connected it with Next.js API routes. Then I stored the user session in cookies and also used React Query for caching.'

const SMOKE_STT_ONLY =
  'so in my last project I used Supabase for the data store and connect it with Next.js api routes then I store the user session in cookies and also used React Query for caching'

describe('corrected-transcript-guard', () => {
  it('tokenizes on whitespace', () => {
    expect(tokenizeWords('  a  b c ')).toEqual(['a', 'b', 'c'])
  })

  it('detects tech / proper-noun patterns', () => {
    expect(isAllowedTechOrProperNoun('Supabase')).toBe(true)
    expect(isAllowedTechOrProperNoun('Next.js')).toBe(true)
    expect(isAllowedTechOrProperNoun('API')).toBe(true)
    expect(isAllowedTechOrProperNoun('connected')).toBe(false)
    expect(isAllowedTechOrProperNoun('connect')).toBe(false)
  })

  it('detects inflection stems (grammar polish)', () => {
    expect(sharesInflectionStem('connect', 'connected')).toBe(true)
    expect(sharesInflectionStem('store', 'stored')).toBe(true)
    expect(sharesInflectionStem('super', 'Supabase')).toBe(false)
  })

  it('allows multi-token STT garble → tech term', () => {
    expect(isAllowedSubstitution(['super', 'a', 'base'], ['Supabase'])).toBe(true)
    expect(isAllowedSubstitution(['next', 'jay', 'es'], ['Next.js'])).toBe(true)
    expect(isAllowedSubstitution(['connect'], ['connected'])).toBe(false)
  })

  it('rejects previous smoke bleed (tense + sentence polish)', () => {
    const result = guardCorrectedTranscript(SMOKE_RAW, SMOKE_BLEED)
    expect(result.accepted).toBe(false)
    expect(result.transcript).toBe(SMOKE_RAW)
    expect(result.reason).toBe('grammar_polish')
    expect(result.rejectedForGrammarPolish).toBe(true)
  })

  it('accepts STT-only cleanup on smoke input', () => {
    const result = guardCorrectedTranscript(SMOKE_RAW, SMOKE_STT_ONLY)
    expect(result.accepted).toBe(true)
    expect(result.transcript).toBe(SMOKE_STT_ONLY)
    expect(result.allowedSubstitutions).toBeGreaterThanOrEqual(2)
    expect(result.rejectedForGrammarPolish).toBe(false)
  })

  it('rejects heavy rewrite above 15% even without inflection', () => {
    const raw = 'I built a small api'
    const rewritten =
      'I designed and implemented a scalable RESTful Application Programming Interface with caching'
    const result = guardCorrectedTranscript(raw, rewritten)
    expect(result.accepted).toBe(false)
    expect(result.reason).toBe('diff_ratio')
    expect(result.diffRatio).toBeGreaterThan(0.15)
    expect(result.transcript).toBe(raw)
  })

  it('wordDiffOps marks equal cores', () => {
    const ops = wordDiffOps(['I', 'used', 'super', 'a', 'base'], ['I', 'used', 'Supabase'])
    expect(ops.some((o) => o.type === 'replace')).toBe(true)
    expect(ops.filter((o) => o.type === 'equal')).toHaveLength(2)
  })

  it('alignTranscriptDiff identifies two replaced spans with offsets (Superb/Jaconian pair)', () => {
    const raw = 'Superb base. Postgres SQL Kubernetes Jaconian,'
    const corrected = 'Supabase. Postgres SQL Kubernetes Jacoco,'
    const ops = alignTranscriptDiff(raw, corrected)
    const replaces = ops.filter((o) => o.type === 'replace')

    expect(replaces).toHaveLength(2)

    const first = replaces[0]
    expect(first.type).toBe('replace')
    if (first.type !== 'replace') return
    expect(first.rawText).toBe(raw.slice(first.rawStart, first.rawEnd))
    expect(first.a.join(' ')).toMatch(/Superb/i)
    expect(first.suggestion).toMatch(/Supabase/i)

    const second = replaces[1]
    expect(second.type).toBe('replace')
    if (second.type !== 'replace') return
    expect(second.rawText).toBe(raw.slice(second.rawStart, second.rawEnd))
    expect(second.a.join(' ')).toMatch(/Jaconian/i)
    expect(second.suggestion).toMatch(/Jacoco/i)

    // Offsets must be in-bounds and non-overlapping-ish (second starts after first ends)
    expect(first.rawStart).toBeGreaterThanOrEqual(0)
    expect(first.rawEnd).toBeGreaterThan(first.rawStart)
    expect(second.rawStart).toBeGreaterThanOrEqual(first.rawEnd)
  })

  it('applyReplaceSuggestion splices only the targeted span', () => {
    const raw = 'Superb base. Postgres SQL Kubernetes Jaconian,'
    const corrected = 'Supabase. Postgres SQL Kubernetes Jacoco,'
    const ops = alignTranscriptDiff(raw, corrected)
    const first = ops.find((o) => o.type === 'replace')
    expect(first?.type).toBe('replace')
    if (first?.type !== 'replace') return

    const afterFirst = applyReplaceSuggestion(raw, first)
    expect(afterFirst).toContain(first.suggestion)
    expect(afterFirst).toContain('Postgres')
    expect(afterFirst).toContain('Jaconian')
    expect(afterFirst).not.toContain('Superb')
  })
})
