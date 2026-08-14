import { describe, expect, it } from 'vitest'
import {
  resolveKnownSpeakVoice,
  resolveSpeakVoice,
  SessionSpeakVoiceGate,
} from './resolve-speak-voice'

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

describe('resolveKnownSpeakVoice', () => {
  it('returns null instead of inventing priya when unhydrated', () => {
    expect(resolveKnownSpeakVoice(null)).toBeNull()
    expect(resolveKnownSpeakVoice(undefined)).toBeNull()
    expect(resolveKnownSpeakVoice('unknown')).toBeNull()
  })

  it('uses stash when the session row is not loaded yet', () => {
    expect(resolveKnownSpeakVoice(null, 'arjun')).toBe('arjun')
    expect(resolveKnownSpeakVoice(undefined, 'priya')).toBe('priya')
  })

  it('session id wins over stash', () => {
    expect(resolveKnownSpeakVoice('arjun', 'priya')).toBe('arjun')
    expect(resolveKnownSpeakVoice('priya', 'arjun')).toBe('priya')
  })
})

describe('SessionSpeakVoiceGate', () => {
  it('first and subsequent sentences use session interviewer X, not the priya hook default', async () => {
    for (const session of ['arjun', 'priya'] as const) {
      const gate = new SessionSpeakVoiceGate()
      expect(gate.peek()).toBeNull()

      const first = gate.wait()
      expect(gate.peek()).toBeNull()
      gate.hydrate(session)

      const firstVoice = await first
      const subsequentVoice = await gate.wait()
      expect(firstVoice).toBe(session)
      expect(subsequentVoice).toBe(session)
      expect(firstVoice).not.toBe(session === 'arjun' ? 'priya' : 'arjun')
    }
  })

  it('stash hydrate lets sentence-0 speak before /session returns', async () => {
    const gate = new SessionSpeakVoiceGate()
    gate.hydrate('arjun')
    expect(await gate.wait()).toBe('arjun')
    gate.hydrate('arjun')
    expect(await gate.wait()).toBe('arjun')
  })

  it('session hydrate overwrites a stale stash', async () => {
    const gate = new SessionSpeakVoiceGate()
    gate.hydrate('priya')
    gate.hydrate('arjun')
    expect(await gate.wait()).toBe('arjun')
  })
})
