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
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  const getVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (!interviewerId) return null
    const voices = window.speechSynthesis.getVoices()
    const interviewer = interviewerId ? getInterviewerById(interviewerId) : undefined
    if (!interviewer) return null
    return resolveVoiceForInterviewer(voices, interviewer)
  }, [interviewerId])

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

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = readTtsRate()
    const interviewer = getInterviewerById(interviewerId)
    utterance.pitch = interviewer?.gender === 'female' ? 1.1 : 0.9
    utterance.volume = 1

    const voice = getVoice()
    if (voice) utterance.voice = voice

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => {
      setIsSpeaking(false)
      onComplete?.()
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      setError('Speech output failed. Continuing without voice playback.')
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
  }, [isSupported, stop, getVoice, interviewerId])

  return { speak, stop, isSpeaking, isSupported, error }
}
