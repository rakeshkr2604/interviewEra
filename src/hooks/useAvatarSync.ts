'use client'
import { useCallback, useRef, useState } from 'react'
import type { InterviewerId } from '@/lib/config/interviewers'
import { useTTS } from './useTTS'

interface UseAvatarSyncReturn {
  isSpeaking: boolean
  currentWordIndex: number
  speechError: string | null
  speakQuestion: (text: string, onComplete?: () => void) => void
  stopSpeaking: () => void
}

export function useAvatarSync(interviewerId: InterviewerId | null): UseAvatarSyncReturn {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const lastMatchedIndexRef = useRef(0)
  const { speak, stop, isSpeaking, error } = useTTS(interviewerId)

  const speakQuestion = useCallback((text: string, onComplete?: () => void) => {
    setCurrentWordIndex(0)
    lastMatchedIndexRef.current = 0

    speak(
      text,
      (_, charIndex) => {
        const spokenPrefix = text
          .slice(0, Math.max(0, charIndex))
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
        const wordsBefore = spokenPrefix.trim().length > 0
          ? spokenPrefix.trim().split(/\s+/).filter(Boolean).length
          : 0
        const nextIndex = Math.max(wordsBefore, lastMatchedIndexRef.current)
        lastMatchedIndexRef.current = nextIndex
        setCurrentWordIndex(nextIndex)
      },
      onComplete  // now wired through to utterance.onend
    )
  }, [speak])

  const stopSpeaking = useCallback(() => {
    stop()
    setCurrentWordIndex(0)
    lastMatchedIndexRef.current = 0
  }, [stop])

  return { isSpeaking, currentWordIndex, speechError: error, speakQuestion, stopSpeaking }
}
