/**
 * @vitest-environment jsdom
 *
 * Regression: when /api/tts soft-fails (503 not configured / session block),
 * useVoicePlayer must actually speak via speechSynthesis — not only log
 * "using browser speech" and call onPlaybackFailed.
 */
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVoicePlayer } from '@/hooks/useVoicePlayer'
import {
  clearElevenLabsTtsBlock,
  markElevenLabsTtsBlocked,
} from '@/lib/voice/elevenlabs-tts-gate'
import * as flowLog from '@/lib/voice/interview-flow-log'
import { STORAGE_KEYS } from '@/lib/settings/client-preferences'
import type { PlaybackCallbacks } from '@/lib/voice/playback-callbacks'

class MockUtterance {
  text: string
  onstart?: () => void
  onend?: () => void
  onerror?: (event: SpeechSynthesisErrorEvent) => void
  constructor(text: string) {
    this.text = text
  }
}

function installSpeechMocks(): void {
  // @ts-expect-error test double
  global.SpeechSynthesisUtterance = MockUtterance

  window.speechSynthesis = {
    cancel: vi.fn(),
    speak: vi.fn((utterance: MockUtterance) => {
      queueMicrotask(() => {
        utterance.onstart?.()
        utterance.onend?.()
      })
    }),
    getVoices: vi.fn(() => [
      {
        default: true,
        lang: 'en-IN',
        localService: true,
        name: 'Google UK English Female',
        voiceURI: 'Google UK English Female',
      } as SpeechSynthesisVoice,
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as SpeechSynthesis
}

type SpeakFn = ReturnType<typeof useVoicePlayer>['speak']

function mountPlayer(onReady: (speak: SpeakFn) => void): Root {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function Probe() {
    const { speak } = useVoicePlayer('priya')
    useEffect(() => {
      onReady(speak)
    }, [speak])
    return null
  }

  act(() => {
    root.render(createElement(Probe))
  })

  return root
}

describe('useVoicePlayer browser TTS fallback', () => {
  let flowSpy: ReturnType<typeof vi.spyOn>
  let root: Root | null = null
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    installSpeechMocks()
    clearElevenLabsTtsBlock()
    localStorage.setItem(STORAGE_KEYS.aiVoiceEnabled, '1')
    flowSpy = vi.spyOn(flowLog, 'interviewFlowLog')
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'TTS not configured', fallback: 'browser_tts' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    document.body.innerHTML = ''
    clearElevenLabsTtsBlock()
    vi.restoreAllMocks()
  })

  it('speaks via speechSynthesis and completes when ElevenLabs returns 503', async () => {
    let speakFn: SpeakFn | null = null
    root = mountPlayer((speak) => {
      speakFn = speak
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(speakFn).not.toBeNull()

    const events: string[] = []
    const callbacks: PlaybackCallbacks = {
      onPlaybackStarted: () => events.push('started'),
      onPlaybackComplete: () => events.push('complete'),
      onPlaybackFailed: () => events.push('failed'),
    }

    await act(async () => {
      await speakFn!('What is a database index?', 'neutral', callbacks)
    })

    expect(events).toEqual(['started', 'complete'])
    expect(window.speechSynthesis.speak).toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalled()
    const fallbackStarts = flowSpy.mock.calls.filter(
      ([, event]) => event === 'browser_tts_fallback_start',
    )
    expect(fallbackStarts.length).toBeGreaterThanOrEqual(1)
  })

  it('uses browser speech without calling /api/tts when ElevenLabs is session-blocked', async () => {
    markElevenLabsTtsBlocked('TTS not configured')
    fetchSpy.mockClear()

    let speakFn: SpeakFn | null = null
    root = mountPlayer((speak) => {
      speakFn = speak
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    const events: string[] = []
    await act(async () => {
      await speakFn!('Explain TypeScript strict mode.', 'neutral', {
        onPlaybackStarted: () => events.push('started'),
        onPlaybackComplete: () => events.push('complete'),
        onPlaybackFailed: () => events.push('failed'),
      })
    })

    expect(events).toEqual(['started', 'complete'])
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(window.speechSynthesis.speak).toHaveBeenCalled()
  })
})
