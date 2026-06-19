'use client'

/**
 * Emergency-only browser STT transport (Web Speech API).
 *
 * This is NOT a production path. It exists solely so that, when Deepgram is
 * unavailable (quota/network/region), an operator-or-user-initiated
 * `switchToFallback()` can keep the interview going with degraded accuracy.
 * It is never auto-selected (audit Phase 4 — "browser fallback only as explicit
 * emergency option").
 *
 * Because Web Speech VAD/endpointing is unreliable across browsers, this
 * transport does not emit `onUtteranceEnd` — answers in fallback mode are
 * submitted manually by the candidate. It still emits live interim/final
 * segments for caption parity.
 */
import { resolveSttLocale } from '@/lib/voice/speech-locale'
import { createVoiceLogger } from '@/lib/voice/core/observability'
import type { SttTransport, SttTransportCallbacks } from '@/lib/voice/stt/stt-transport'

const log = createVoiceLogger('stt-browser')

interface SpeechRecognitionAlternativeLike {
  transcript: string
}
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: SpeechRecognitionAlternativeLike
}
interface SpeechRecognitionResultListLike {
  readonly length: number
  [index: number]: SpeechRecognitionResultLike
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultListLike
}
interface SpeechRecognitionErrorEventLike {
  readonly error: string
}
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isBrowserSttSupported(): boolean {
  return getRecognitionCtor() !== null
}

export class BrowserSttTransport implements SttTransport {
  readonly kind = 'browser' as const

  private recognition: SpeechRecognitionLike | null = null
  private callbacks: SttTransportCallbacks | null = null
  private stopped = false
  private wantRunning = false

  async start(callbacks: SttTransportCallbacks): Promise<void> {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      throw new Error('Browser speech recognition is not supported.')
    }
    this.callbacks = callbacks
    this.stopped = false
    this.wantRunning = true

    const rec = new Ctor()
    rec.lang = resolveSttLocale()
    rec.continuous = true
    rec.interimResults = true
    this.recognition = rec

    rec.onstart = () => {
      if (this.stopped) return
      this.callbacks?.onOpen()
    }
    rec.onresult = (event) => {
      if (this.stopped) return
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0]?.transcript ?? ''
        if (!text) continue
        if (result.isFinal) this.callbacks?.onFinalSegment(text)
        else this.callbacks?.onPartial(text)
      }
    }
    rec.onerror = (event) => {
      if (this.stopped) return
      // 'no-speech'/'aborted' are benign; surface the rest.
      if (event.error === 'no-speech' || event.error === 'aborted') return
      this.callbacks?.onError(new Error(`Speech recognition error: ${event.error}`))
    }
    rec.onend = () => {
      // Web Speech stops on silence; auto-restart while we still want it running.
      if (this.stopped || !this.wantRunning) {
        this.callbacks?.onClose({})
        return
      }
      try {
        rec.start()
      } catch {
        /* restart races are benign */
      }
    }

    try {
      rec.start()
    } catch (err) {
      throw err instanceof Error ? err : new Error(String(err))
    }
    log.info('browser_stt_started', null, {})
  }

  sendAudio(_frame: ArrayBuffer): void {
    // Web Speech captures from the mic itself — frames are ignored.
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    this.wantRunning = false
    const rec = this.recognition
    this.recognition = null
    if (rec) {
      rec.onresult = null
      rec.onerror = null
      rec.onstart = null
      rec.onend = null
      try {
        rec.abort()
      } catch {
        /* */
      }
    }
    log.info('browser_stt_stopped', null, {})
  }
}
