import { describe, expect, it } from 'vitest'
import { TranscriptAssembler } from '@/lib/voice/stt/transcript-assembler'

describe('TranscriptAssembler', () => {
  it('joins finalized segments', () => {
    const a = new TranscriptAssembler()
    a.appendFinal('I built')
    a.appendFinal('a React app')
    expect(a.final()).toBe('I built a React app')
  })

  it('suppresses consecutive duplicate finals', () => {
    const a = new TranscriptAssembler()
    a.appendFinal('hello world')
    a.appendFinal('hello world')
    a.appendFinal('hello world')
    expect(a.final()).toBe('hello world')
  })

  it('allows a repeat that is not consecutive', () => {
    const a = new TranscriptAssembler()
    a.appendFinal('yes')
    a.appendFinal('no')
    a.appendFinal('yes')
    expect(a.final()).toBe('yes no yes')
  })

  it('merges interim with finalized text', () => {
    const a = new TranscriptAssembler()
    a.appendFinal('I led')
    a.setInterim('a team of')
    expect(a.merged()).toBe('I led a team of')
    expect(a.final()).toBe('I led') // final unaffected by interim
  })

  it('clears interim when a final lands', () => {
    const a = new TranscriptAssembler()
    a.setInterim('partial words')
    a.appendFinal('final words')
    expect(a.merged()).toBe('final words')
  })

  it('ignores empty / whitespace segments', () => {
    const a = new TranscriptAssembler()
    a.appendFinal('   ')
    a.appendFinal('')
    expect(a.hasContent()).toBe(false)
    expect(a.merged()).toBe('')
  })

  it('reports content from interim alone', () => {
    const a = new TranscriptAssembler()
    a.setInterim('still talking')
    expect(a.hasContent()).toBe(true)
    expect(a.merged()).toBe('still talking')
  })

  it('restore replaces text without duplicating on next final', () => {
    const a = new TranscriptAssembler()
    a.restore('earlier answer')
    a.appendFinal('continued')
    expect(a.final()).toBe('earlier answer continued')
  })

  it('reset clears everything', () => {
    const a = new TranscriptAssembler()
    a.appendFinal('something')
    a.setInterim('more')
    a.reset()
    expect(a.hasContent()).toBe(false)
    expect(a.merged()).toBe('')
  })
})
