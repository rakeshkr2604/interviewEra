import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  clearElevenLabsTtsBlock,
  isElevenLabsTtsBlocked,
  markElevenLabsBlockedForHttpStatus,
  markElevenLabsTtsBlocked,
} from '@/lib/voice/elevenlabs-tts-gate'

function createSessionStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key)
    },
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
  }
}

describe('elevenlabs-tts-gate', () => {
  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorage())
    clearElevenLabsTtsBlock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts unblocked', () => {
    expect(isElevenLabsTtsBlocked()).toBe(false)
  })

  it('blocks for session after 401', () => {
    markElevenLabsBlockedForHttpStatus(401, 'quota exceeded')
    expect(isElevenLabsTtsBlocked()).toBe(true)
  })

  it('blocks with cooldown for 429 then expires', () => {
    markElevenLabsBlockedForHttpStatus(429, 'rate limited')
    expect(isElevenLabsTtsBlocked()).toBe(true)
    expect(isElevenLabsTtsBlocked(Date.now() + 121_000)).toBe(false)
  })

  it('reads block from sessionStorage', () => {
    sessionStorage.setItem(
      'ie-el-tts-blocked',
      JSON.stringify({
        reason: 'quota',
        blocked_at: Date.now(),
        until: null,
      }),
    )
    expect(isElevenLabsTtsBlocked()).toBe(true)
  })

  it('clear removes block', () => {
    markElevenLabsTtsBlocked('test')
    clearElevenLabsTtsBlock()
    expect(isElevenLabsTtsBlocked()).toBe(false)
  })
})
