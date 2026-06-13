import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  clearElevenLabsTtsBlock,
  isElevenLabsTtsBlocked,
} from '@/lib/voice/elevenlabs-tts-gate'
import { ProsodicTTS, TTSFallbackToBrowserError } from '@/lib/voice/tts-client'

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

/** Mirrors avatar session: try ElevenLabs unless gate is active. */
async function speakQuestionViaGate(
  tts: ProsodicTTS,
  text: string,
  fetchCalls: { count: number },
): Promise<'elevenlabs' | 'browser'> {
  if (isElevenLabsTtsBlocked()) {
    return 'browser'
  }
  try {
    await tts.speak(text, { voice: 'female', tone: 'neutral' })
    return 'elevenlabs'
  } catch (err) {
    if (err instanceof TTSFallbackToBrowserError) {
      return 'browser'
    }
    throw err
  } finally {
    void fetchCalls
  }
}

describe('ElevenLabs TTS gate — release verification', () => {
  let fetchCalls: { count: number }

  beforeEach(() => {
    vi.stubGlobal('sessionStorage', createSessionStorage())
    clearElevenLabsTtsBlock()
    fetchCalls = { count: 0 }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        fetchCalls.count += 1
        return new Response(
          JSON.stringify({
            error: 'ElevenLabs 401: quota exceeded',
            fallback: 'browser_tts',
          }),
          { status: 401 },
        )
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('401: Q1 one /api/tts, Q2 and Q3 zero requests', async () => {
    const tts = new ProsodicTTS()

    const q1 = await speakQuestionViaGate(tts, 'Question one text', fetchCalls)
    expect(fetchCalls.count).toBe(1)
    expect(q1).toBe('browser')
    expect(isElevenLabsTtsBlocked()).toBe(true)

    const q2 = await speakQuestionViaGate(tts, 'Question two text', fetchCalls)
    expect(fetchCalls.count).toBe(1)
    expect(q2).toBe('browser')

    const q3 = await speakQuestionViaGate(tts, 'Question three text', fetchCalls)
    expect(fetchCalls.count).toBe(1)
    expect(q3).toBe('browser')
  })

  it('429: cooldown suppresses repeats then allows retry', async () => {
    clearElevenLabsTtsBlock()
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        return new Response(
          JSON.stringify({ error: 'rate limited', fallback: 'browser_tts' }),
          { status: 429, headers: { 'Retry-After': '120' } },
        )
      }),
    )

    const tts = new ProsodicTTS()
    await expect(tts.speak('q1', { voice: 'female', tone: 'neutral' })).rejects.toBeInstanceOf(
      TTSFallbackToBrowserError,
    )
    expect(calls).toBe(1)
    expect(isElevenLabsTtsBlocked()).toBe(true)

    await expect(tts.speak('q2', { voice: 'female', tone: 'neutral' })).rejects.toBeInstanceOf(
      TTSFallbackToBrowserError,
    )
    expect(calls).toBe(1)

    expect(isElevenLabsTtsBlocked(Date.now() + 121_000)).toBe(false)

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        return new Response(new ArrayBuffer(8), { status: 200 })
      }),
    )
    await tts.speak('q3 after cooldown', { voice: 'female', tone: 'neutral' })
    expect(calls).toBe(2)
  })

  it('blocked gate returns browser path without fetch for consecutive questions', async () => {
    const tts = new ProsodicTTS()
    await speakQuestionViaGate(tts, 'first', fetchCalls)

    const engines: Array<'elevenlabs' | 'browser'> = []
    for (let i = 0; i < 5; i++) {
      engines.push(await speakQuestionViaGate(tts, `question ${i}`, fetchCalls))
    }
    expect(fetchCalls.count).toBe(1)
    expect(engines.every((e) => e === 'browser')).toBe(true)
  })
})
