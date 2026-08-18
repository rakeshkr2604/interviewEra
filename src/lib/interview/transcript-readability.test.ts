import { describe, expect, it } from 'vitest'
import {
  applyParagraphBreaks,
  normalizeSpeechSpacing,
  spacingNeedsFix,
  suggestParagraphBreaks,
  withSuggestedParagraphBreaks,
} from './transcript-readability'

const WALL = [
  'My name is Rakesh Kumar. I am from Ranchi Jharkhand.',
  'Currently living in Bangalore. I am MCA graduate, and I have recently completed my MCA from Sarala Birla University,',
  'and I have also completed a minor in CSE from IIT Mandi with 8.3 CGPA.',
  "I'm also a founder of InterviewEra, where over 150 users are actively using it.",
  "While building it, I learned a lot about API, system design and Next.js.",
  "I'm excited for this role. I believe I can contribute to the team.",
].join(' ')

describe('suggestParagraphBreaks', () => {
  it('returns no breaks for short answers', () => {
    expect(suggestParagraphBreaks('My name is Rakesh. I am a developer.')).toEqual([])
  })

  it('skips text that already has blank lines', () => {
    expect(suggestParagraphBreaks('Hello there everyone.\n\nI am fine today and more words here.')).toEqual([])
  })

  it('suggests breaks in a long spoken wall of text', () => {
    const breaks = suggestParagraphBreaks(WALL)
    expect(breaks.length).toBeGreaterThanOrEqual(2)
    expect(breaks.length).toBeLessThanOrEqual(5)
    // All offsets land at the start of a sentence-ish span
    for (const b of breaks) {
      expect(WALL[b.insertAt - 1]).toMatch(/\s/)
      expect(WALL[b.insertAt]).toMatch(/[A-Za-z"'“]/)
    }
  })

  it('applyParagraphBreaks inserts blank lines without dropping words', () => {
    const breaks = suggestParagraphBreaks(WALL)
    const next = applyParagraphBreaks(WALL, breaks)
    expect(next.replace(/\s+/g, ' ').trim()).toBe(WALL.replace(/\s+/g, ' ').trim())
    expect(next).toContain('\n\n')
  })

  it('withSuggestedParagraphBreaks is idempotent so auto-apply cannot loop', () => {
    const once = withSuggestedParagraphBreaks(WALL)
    expect(once).toContain('\n\n')
    expect(withSuggestedParagraphBreaks(once)).toBe(once)
    expect(suggestParagraphBreaks(once)).toEqual([])
  })
})

describe('normalizeSpeechSpacing', () => {
  it('fixes space-before-comma and missing space after comma/period', () => {
    expect(normalizeSpeechSpacing('API ,system design')).toBe('API, system design')
    expect(normalizeSpeechSpacing('end.Currently living')).toBe('end. Currently living')
    expect(spacingNeedsFix('API ,system')).toBe(true)
    expect(spacingNeedsFix('API, system')).toBe(false)
  })
})
