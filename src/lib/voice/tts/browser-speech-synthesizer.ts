'use client'

/**
 * Browser speechSynthesis fallback for TtsPipeline.
 *
 * When ElevenLabs fails (429 / quota / timeout / network → `TtsFallbackError`),
 * the pipeline invokes this speaker so the interview remains audible. This does
 * NOT touch STT — browser speech recognition is never used here.
 */
import { resolveVoiceForInterviewer } from '@/lib/interviewer/voice'
import { getInterviewerById, type InterviewerId } from '@/lib/config/interviewers'
import { readTtsRate } from '@/lib/settings/client-preferences'
import { resolveSttLocale } from '@/lib/voice/speech-locale'
import { createVoiceLogger } from '@/lib/voice/core/observability'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'
import type { TtsFallbackSpeaker } from '@/lib/voice/tts/tts-pipeline'
import type { TTSOptions } from '@/lib/voice/tts-client'

const log = createVoiceLogger('tts-browser-fallback')

function pickVoice(voice: TTSOptions['voice']): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const interviewer =
    voice === 'female' || voice === 'male'
      ? getInterviewerById(voice === 'female' ? 'priya' : 'arjun')
      : getInterviewerById(voice as InterviewerId)
  if (interviewer) {
    return resolveVoiceForInterviewer(voices, interviewer)
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith('en')) ?? voices[0] ?? null
}

async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !window.speechSynthesis) return []
  const ready = window.speechSynthesis.getVoices()
  if (ready.length > 0) return ready
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener('voiceschanged', finish)
      resolve(window.speechSynthesis.getVoices())
    }
    window.speechSynthesis.addEventListener('voiceschanged', finish)
    setTimeout(finish, 1500)
  })
}

export function createBrowserSpeechFallback(): TtsFallbackSpeaker {
  let current: SpeechSynthesisUtterance | null = null

  return {
    isAvailable(): boolean {
      return (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        typeof window.SpeechSynthesisUtterance === 'function'
      )
    },

    async speak(text: string, options: TTSOptions, signal: AbortSignal): Promise<void> {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        throw new Error('Browser speech synthesis is unavailable.')
      }

      const clean = text.trim()
      if (!clean) return

      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      const synth = window.speechSynthesis
      synth.cancel()

      const voices = await loadVoices()
      const voice = pickVoice(options.voice) ?? (voices.length > 0 ? voices[0] : null)

      return new Promise<void>((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(clean)
        current = utterance
        utterance.rate = Math.min(0.92, readTtsRate())
        utterance.pitch = options.voice === 'female' ? 1.02 : 0.94
        utterance.volume = 0.92
        utterance.lang = voice?.lang ?? resolveSttLocale()
        if (voice) utterance.voice = voice

        const onAbort = () => {
          synth.cancel()
          cleanup()
          reject(new DOMException('Aborted', 'AbortError'))
        }

        const cleanup = () => {
          signal.removeEventListener('abort', onAbort)
          if (current === utterance) current = null
        }

        signal.addEventListener('abort', onAbort)

        utterance.onstart = () => {
          log.info('tts_browser_fallback_active', null, { chars: clean.length })
          interviewFlowLog('tts', 'browser_tts_fallback_active', { chars: clean.length })
        }

        utterance.onend = () => {
          cleanup()
          interviewFlowLog('tts', 'browser_tts_fallback_complete', { chars: clean.length })
          resolve()
        }

        utterance.onerror = (event) => {
          cleanup()
          const code = (event as SpeechSynthesisErrorEvent).error
          reject(new Error(code ? `Browser TTS failed: ${code}` : 'Browser TTS failed.'))
        }

        synth.speak(utterance)
      })
    },

    cancel(): void {
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* idempotent */
      }
      current = null
    },
  }
}

export function createBrowserSpeechFallbackForInterviewer(
  interviewerId: InterviewerId | null,
): TtsFallbackSpeaker {
  const base = createBrowserSpeechFallback()
  return {
    isAvailable: base.isAvailable,
    cancel: base.cancel,
    speak(text, options, signal) {
      const interviewer = getInterviewerById(interviewerId)
      const voiceOpt: TTSOptions['voice'] =
        interviewer?.gender === 'male'
          ? 'male'
          : interviewer?.gender === 'female'
            ? 'female'
            : options.voice
      return base.speak(text, { ...options, voice: voiceOpt }, signal)
    },
  }
}
