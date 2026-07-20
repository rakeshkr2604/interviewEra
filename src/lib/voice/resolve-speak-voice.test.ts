import { describe, expect, it } from 'vitest'
import { resolveSpeakVoice } from './resolve-speak-voice'

describe('resolveSpeakVoice', () => {
  it('prefers session interviewer_id over the hook fallback', () => {
    expect(resolveSpeakVoice('arjun', 'priya')).toBe('arjun')
    expect(resolveSpeakVoice('priya', 'arjun')).toBe('priya')
  })

  it('falls back when session is not yet loaded', () => {
    expect(resolveSpeakVoice(null, 'priya')).toBe('priya')
    expect(resolveSpeakVoice(undefined, 'priya')).toBe('priya')
  })

  it('ignores unknown session ids and uses the fallback', () => {
    expect(resolveSpeakVoice('unknown', 'arjun')).toBe('arjun')
    expect(resolveSpeakVoice('', 'priya')).toBe('priya')
  })
})
