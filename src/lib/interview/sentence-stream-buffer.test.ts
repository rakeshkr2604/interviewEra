import { describe, expect, it } from 'vitest'
import { SentenceStreamBuffer } from '@/lib/interview/sentence-stream-buffer'

describe('SentenceStreamBuffer', () => {
  it('emits complete sentences on terminal punctuation', () => {
    const emitted: string[] = []
    const buffer = new SentenceStreamBuffer((s) => emitted.push(s))

    buffer.append('That makes sense. ')
    expect(emitted).toEqual(['That makes sense.'])

    buffer.append('Can you explain your database scaling strategy?')
    buffer.flush()
    expect(emitted).toEqual([
      'That makes sense.',
      'Can you explain your database scaling strategy?',
    ])
  })

  it('ignores abbreviations like Dr. and decimal numbers like 3.14', () => {
    const emitted: string[] = []
    const buffer = new SentenceStreamBuffer((s) => emitted.push(s))

    buffer.append('Dr. Smith calculated 3.14 ratio. However, the query was slow.')
    buffer.flush()

    expect(emitted[0]).toContain('Dr. Smith calculated 3.14 ratio.')
    expect(emitted[1]).toBe('However, the query was slow.')
  })

  it('filters out very short sentence fragments', () => {
    const emitted: string[] = []
    const buffer = new SentenceStreamBuffer((s) => emitted.push(s), { minSentenceChars: 15 })

    buffer.append('Ok. ')
    expect(emitted).toEqual([])

    buffer.append('Tell me more about your architecture choice.')
    expect(emitted).toEqual(['Ok. Tell me more about your architecture choice.'])
  })
})
