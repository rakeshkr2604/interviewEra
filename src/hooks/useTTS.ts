'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewerId } from '@/lib/config/interviewers'
import { resolveVoiceForInterviewer } from '@/lib/interviewer/voice'
import { readAiVoiceEnabled, readTtsRate } from '@/lib/settings/client-preferences'
import { resolveSttLocale } from '@/lib/voice/speech-locale'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'
import { normalizePlaybackArg, type PlaybackCallbacks } from '@/lib/voice/playback-callbacks'

interface UseTTSReturn {
  speak: (
    text: string,
    onWordBoundary?: (word: string, charIndex: number) => void,
    callbacks?: (() => void) | PlaybackCallbacks,
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
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const warm = () => { window.speechSynthesis.getVoices() }
    warm()
    window.speechSynthesis.addEventListener('voiceschanged', warm)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', warm)
      window.speechSynthesis?.cancel()
    }
  }, [])

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
    callbacksArg?: (() => void) | PlaybackCallbacks,
  ) => {
    const callbacks = normalizePlaybackArg(callbacksArg)

    if (!isSupported) {
      callbacks.onPlaybackFailed?.('Speech synthesis is not supported in this browser.')
      return
    }
    setError(null)
    stop()

    if (!readAiVoiceEnabled()) {
      callbacks.onPlaybackFailed?.('AI voice is disabled in settings.')
      return
    }

    const interviewer = getInterviewerById(interviewerId)

    const startUtterance = (voice: SpeechSynthesisVoice | null) => {
      const utterance = new SpeechSynthesisUtterance(text)
      const baseRate = Math.min(0.92, readTtsRate())
      utterance.rate = baseRate
      utterance.pitch = interviewer?.gender === 'female' ? 1.02 : 0.94
      utterance.volume = 0.92
      utterance.lang = voice?.lang ?? resolveSttLocale()
      if (voice) utterance.voice = voice

      utterance.onstart = () => {
        setIsSpeaking(true)
        interviewFlowLog('tts', 'browser_tts_onstart', { textLen: text.length })
        callbacks.onPlaybackStarted?.()
      }
      utterance.onend = () => {
        setIsSpeaking(false)
        interviewFlowLog('tts', 'browser_tts_onend', { textLen: text.length })
        callbacks.onPlaybackComplete?.()
      }
      utterance.onerror = (event) => {
        setIsSpeaking(false)
        const code = (event as SpeechSynthesisErrorEvent).error
        let failMessage = `Speech failed (${code ?? 'unknown'})`
        switch (code) {
          case 'canceled':
          case 'interrupted':
            console.log('[tts] benign_cancel', { code })
            return
          case 'voice-unavailable':
          case 'language-unavailable':
            console.warn('[tts] voice_lang_unavailable', { code })
            if (voice !== null && utterance.voice !== null) {
              queueMicrotask(() => startUtterance(null))
              return
            }
            break
          case 'audio-busy':
          case 'audio-hardware':
            failMessage = 'Speakers are busy or unavailable.'
            setError(failMessage)
            break
          case 'network':
            failMessage = 'Network issue while loading the voice.'
            setError(failMessage)
            break
          case 'synthesis-failed':
          case 'synthesis-unavailable':
            failMessage = 'Browser voice engine failed.'
            setError(failMessage)
            break
          case 'not-allowed':
            failMessage = 'Voice playback is blocked. Tap Retry Audio on this question.'
            setError(failMessage)
            break
          case 'text-too-long':
            failMessage = 'Question is too long for the voice engine.'
            setError(failMessage)
            break
          default:
            setError(failMessage)
        }
        callbacks.onPlaybackFailed?.(failMessage)
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
