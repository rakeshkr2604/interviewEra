import { describe, expect, it } from 'vitest'
import { mergeFinalTranscript, shouldPromoteInterimOnEnd } from '@/lib/voice/stt-transcript'

describe('mergeFinalTranscript', () => {
  it('appends non-overlapping segments', () => {
    const r = mergeFinalTranscript('Hello', 'world', { androidCumulative: false })
    expect(r.action).toBe('append')
    expect(r.text).toBe('Hello world')
  })

  it('ignores exact duplicate finals', () => {
    const r = mergeFinalTranscript('Hello world', 'Hello world', { androidCumulative: false })
    expect(r.action).toBe('ignore')
    expect(r.text).toBe('Hello world')
  })

  it('replaces cumulative prefix finals', () => {
    const r = mergeFinalTranscript('Hello', 'Hello world', { androidCumulative: false })
    expect(r.action).toBe('replace')
    expect(r.text).toBe('Hello world')
  })

  it('merges overlapping word boundaries', () => {
    const r = mergeFinalTranscript('the quick brown', 'brown fox', { androidCumulative: false })
    expect(r.action).toBe('append')
    expect(r.text).toBe('the quick brown fox')
  })
})

describe('shouldPromoteInterimOnEnd', () => {
  it('promotes interim when final is empty', () => {
    expect(shouldPromoteInterimOnEnd('', 'still speaking')).toBe(true)
  })

  it('skips duplicate interim on end', () => {
    expect(shouldPromoteInterimOnEnd('hello world', 'hello world')).toBe(false)
  })
})
