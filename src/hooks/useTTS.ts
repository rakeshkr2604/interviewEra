'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import { resolveVoiceForInterviewer } from '@/lib/interviewer/voice'
import { readAiVoiceEnabled, readTtsRate } from '@/lib/settings/client-preferences'

interface UseTTSReturn {
  speak: (
    text: string,
    onWordBoundary?: (word: string, charIndex: number) => void,
    onComplete?: () => void
  ) => void
  stop: () => void
  isSpeaking: boolean
  isSupported: boolean
  error: string | null
}

export function useTTS(interviewerId: InterviewerId | null): UseTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window
  )
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    // Warm the voice list on mount. getVoices() is populated asynchronously;
    // calling it early + listening for 'voiceschanged' makes the correct
    // interviewer voice available before the first question is spoken.
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const warm = () => { window.speechSynthesis.getVoices() }
    warm()
    window.speechSynthesis.addEventListener('voiceschanged', warm)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', warm)
      window.speechSynthesis?.cancel()
    }
  }, [])

  // Resolve voices, awaiting the async 'voiceschanged' event if the list is
  // not ready yet (the post-refresh case). Without this, a fresh page load
  // speaks with the browser's DEFAULT system voice — often the wrong gender,
  // which is the "Priya selected but Arjun's voice spoke after refresh" bug.
  const loadVoices = useCallback((): Promise<SpeechSynthesisVoice[]> => {
    return new Promise((resolve) => {
      const ready = window.speechSynthesis.getVoices()
      if (ready.length > 0) { resolve(ready); return }
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.speechSynthesis.removeEventListener('voiceschanged', finish)
        resolve(window.speechSynthesis.getVoices())
      }
      window.speechSynthesis.addEventListener('voiceschanged', finish)
      // Some browsers never fire 'voiceschanged'; don't block speech forever.
      setTimeout(finish, 1500)
    })
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }, [])

  const speak = useCallback((
    text: string,
    onWordBoundary?: (word: string, charIndex: number) => void,
    onComplete?: () => void
  ) => {
    if (!isSupported) return
    setError(null)
    stop()

    if (!readAiVoiceEnabled()) {
      queueMicrotask(() => onComplete?.())
      return
    }

    const interviewer = getInterviewerById(interviewerId)

    const startUtterance = (voice: SpeechSynthesisVoice | null) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = readTtsRate()
      utterance.pitch = interviewer?.gender === 'female' ? 1.1 : 0.9
      utterance.volume = 1
      if (voice) utterance.voice = voice

      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => {
        setIsSpeaking(false)
        onComplete?.()
      }
      utterance.onerror = (event) => {
        // Branch on the SpeechSynthesisErrorEvent's `error` code so we don't
        // surface harmless lifecycle events (cancellations, voice swaps) as
        // "Speech output failed" — that was the source of the spurious amber
        // banner appearing after every successful question on some browsers.
        //
        // Error codes (W3C):
        //   - canceled / interrupted: WE called speechSynthesis.cancel() (e.g.
        //     Skip, Submit, next question). Benign — no user-facing message.
        //   - voice-unavailable / language-unavailable: requested voice/lang
        //     not available. Logged, no red banner — engine usually still
        //     speaks with a fallback voice.
        //   - audio-busy / audio-hardware: device contention. Surface a
        //     friendly hint.
        //   - network: speech engine fetched online voice and failed. Surface.
        //   - synthesis-failed / synthesis-unavailable: hard engine failure.
        //     Surface.
        //   - default / unknown: generic message — but we now name the code so
        //     users can report it accurately.
        //
        // CRITICAL: every branch still calls onComplete so the phase machine
        // releases. A silent failure (no onComplete) would leave the session
        // stuck in avatar_speaking forever.
        setIsSpeaking(false)
        const code = (event as SpeechSynthesisErrorEvent).error
        switch (code) {
          case 'canceled':
          case 'interrupted':
            console.log('[tts] benign_cancel', { code })
            break
          case 'voice-unavailable':
          case 'language-unavailable':
            console.warn('[tts] voice_lang_unavailable', { code })
            // One retry with engine default voice — resolves most "wrong gender" / missing pack issues.
            if (voice !== null && utterance.voice !== null) {
              console.info('[tts] retry_with_default_voice')
              queueMicrotask(() => startUtterance(null))
              return
            }
            break
          case 'audio-busy':
          case 'audio-hardware':
            setError('Speakers are busy or unavailable. Voice playback paused.')
            break
          case 'network':
            setError('Network issue while loading the voice. Continuing without voice playback.')
            break
          case 'synthesis-failed':
          case 'synthesis-unavailable':
            setError('Browser voice engine failed. Continuing without voice playback.')
            break
          case 'not-allowed':
            setError('Voice playback is blocked. Click anywhere on the page to enable it, then try the next question.')
            break
          case 'text-too-long':
            setError('Question is too long for the voice engine. Continuing without voice playback.')
            break
          default:
            setError(`Speech output failed (${code ?? 'unknown'}). Continuing without voice playback.`)
        }
        onComplete?.()
      }

      if (onWordBoundary) {
        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            const word = text.slice(event.charIndex, event.charIndex + event.charLength)
            onWordBoundary(word, event.charIndex)
          }
        }
      }

      utteranceRef.current = utterance
      window.speechSynthesis.speak(utterance)
    }

    if (!interviewer) {
      startUtterance(null)
      return
    }

    // Apply the persisted interviewer's voice. If the voice list isn't ready
    // (fresh page load / refresh), wait for it rather than speaking with the
    // wrong default voice — interviewer identity must survive a refresh.
    const ready = window.speechSynthesis.getVoices()
    if (ready.length > 0) {
      startUtterance(resolveVoiceForInterviewer(ready, interviewer))
    } else {
      void loadVoices().then((vs) =>
        startUtterance(resolveVoiceForInterviewer(vs, interviewer)),
      )
    }
  }, [isSupported, stop, loadVoices, interviewerId])

  return { speak, stop, isSpeaking, isSupported, error }
}
