/**
 * @vitest-environment jsdom
 */
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTTS } from '@/hooks/useTTS'
import type { PlaybackCallbacks } from '@/lib/voice/playback-callbacks'
import {
  clearElevenLabsTtsBlock,
  markElevenLabsTtsBlocked,
} from '@/lib/voice/elevenlabs-tts-gate'
import * as flowLog from '@/lib/voice/interview-flow-log'
import { STORAGE_KEYS } from '@/lib/settings/client-preferences'

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

type SpeakFn = (
  text: string,
  onWordBoundary?: (word: string, charIndex: number) => void,
  callbacks?: (() => void) | PlaybackCallbacks,
) => void

function mountUseTts(onReady: (speak: SpeakFn) => void): Root {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function Probe() {
    const { speak } = useTTS('priya')
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

async function speakBlockedAvatarQuestion(
  questionIndex: number,
  intro: string,
  speak: SpeakFn,
  startupEvents: string[],
): Promise<void> {
  await new Promise<void>((resolve) => {
    speak(intro, undefined, {
      onPlaybackComplete: () => {
        if (questionIndex === 0) {
          startupEvents.push('tts_completed')
        }
        resolve()
      },
    })
  })
}

describe('Browser TTS fallback — consecutive questions', () => {
  let flowSpy: ReturnType<typeof vi.spyOn>
  let root: Root | null = null

  beforeEach(() => {
    installSpeechMocks()
    clearElevenLabsTtsBlock()
    markElevenLabsTtsBlocked('elevenlabs_401')
    localStorage.setItem(STORAGE_KEYS.aiVoiceEnabled, '1')
    flowSpy = vi.spyOn(flowLog, 'interviewFlowLog')
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    root = null
    document.body.innerHTML = ''
    vi.restoreAllMocks()
    clearElevenLabsTtsBlock()
  })

  it('emits browser_tts_onstart and tts_completed across multiple questions', async () => {
    const startupEvents: string[] = []
    let speakFn: SpeakFn | null = null

    root = mountUseTts((speak) => {
      speakFn = speak
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(speakFn).not.toBeNull()

    for (let q = 0; q < 3; q++) {
      await act(async () => {
        await speakBlockedAvatarQuestion(q, `Question ${q + 1} intro`, speakFn!, startupEvents)
      })
    }

    const onstartCalls = flowSpy.mock.calls.filter(([, event]) => event === 'browser_tts_onstart')
    expect(onstartCalls).toHaveLength(3)
    expect(startupEvents).toEqual(['tts_completed'])
    expect(window.speechSynthesis.speak).toHaveBeenCalledTimes(3)
  })
})
