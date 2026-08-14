import { describe, expect, it } from 'vitest'
import { alignTranscriptDiff } from './corrected-transcript-guard'
import {
  buildHighlightRenderSegments,
  renderedTextFromSegments,
} from './review-highlight-render'

describe('buildHighlightRenderSegments', () => {
  it('19: visible text reproduces the value exactly (single spaces)', () => {
    const value = 'I use super base and connect it with my app'
    const corrected = 'I use Supabase and connect it with my app'
    const ops = alignTranscriptDiff(value, corrected)
    const segments = buildHighlightRenderSegments(value, ops)
    expect(renderedTextFromSegments(segments)).toBe(value)
    expect(segments.some((s) => s.kind === 'replace')).toBe(true)
  })

  it('20: paragraph breaks (\\n\\n) survive in the rendered output', () => {
    const value =
      'My name is Rakesh and I studied at super base university.\n\nCurrently I build web apps in Bangalore.'
    const corrected =
      'My name is Rakesh and I studied at Supabase university. Currently I build web apps in Bangalore.'
    const ops = alignTranscriptDiff(value, corrected)
    const segments = buildHighlightRenderSegments(value, ops)
    const rendered = renderedTextFromSegments(segments)
    expect(rendered).toBe(value)
    expect(rendered).toContain('\n\n')
  })

  it('multi-space and trailing whitespace are preserved verbatim', () => {
    const value = '  spaced   words  here  '
    const ops = alignTranscriptDiff(value, 'spaced words here')
    const segments = buildHighlightRenderSegments(value, ops)
    expect(renderedTextFromSegments(segments)).toBe(value)
  })

  it('replace segment text comes from the value slice, not the token join', () => {
    const value = 'Postgres  SQL is what we used'
    const corrected = 'PostgreSQL is what we used'
    const ops = alignTranscriptDiff(value, corrected)
    const segments = buildHighlightRenderSegments(value, ops)
    const replace = segments.find((s) => s.kind === 'replace')
    expect(replace).toBeDefined()
    // Double space between the two raw tokens must be preserved inside the span.
    expect(replace!.text).toBe('Postgres  SQL')
    expect(renderedTextFromSegments(segments)).toBe(value)
  })

  it('empty ops (no corrections) yields the whole value as one text segment', () => {
    const segments = buildHighlightRenderSegments('hello world', [])
    expect(segments).toEqual([{ kind: 'text', text: 'hello world', start: 0 }])
  })

  it('formatting (paragraph breaks) never drops or duplicates words in the render', () => {
    const value =
      'I use super base for auth and connect it with my app.\n\nCurrently I build web apps in Bangalore.'
    const corrected = 'I use Supabase for auth and connect it with my app. Currently I build web apps in Bangalore.'
    const ops = alignTranscriptDiff(value, corrected)
    const segments = buildHighlightRenderSegments(value, ops)
    expect(renderedTextFromSegments(segments)).toBe(value)
    expect(renderedTextFromSegments(segments).includes('Currently')).toBe(true)
    expect(renderedTextFromSegments(segments)).toContain('\n\n')
  })
})
