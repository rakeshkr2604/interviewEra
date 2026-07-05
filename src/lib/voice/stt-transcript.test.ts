import { describe, expect, it } from 'vitest'
import {
  mergeFinalTranscript,
  shouldPromoteInterimOnEnd,
  shouldSuppressInterimAsDuplicate,
} from '@/lib/voice/stt-transcript'

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

describe('shouldSuppressInterimAsDuplicate', () => {
  it('suppresses exact duplicate interim', () => {
    expect(shouldSuppressInterimAsDuplicate('hello hello', 'hello hello')).toBe(true)
  })

  it('suppresses strict substring interim', () => {
    expect(shouldSuppressInterimAsDuplicate('hello hello', 'hello')).toBe(true)
  })

  it('allows cumulative interim that extends final', () => {
    expect(shouldSuppressInterimAsDuplicate('hello hello', 'hello hello world')).toBe(false)
  })

  it('allows distinct new interim', () => {
    expect(shouldSuppressInterimAsDuplicate('hello hello', 'testing')).toBe(false)
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
