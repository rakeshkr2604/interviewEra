'use client'

/**
 * React binding for the VoiceSessionOrchestrator.
 *
 * The orchestrator is the authority; this hook is a thin adapter that:
 *  - builds the session once (composition root) and disposes it on unmount,
 *  - mirrors the orchestrator snapshot into React state, driven by the event
 *    bus (no polling, no duplicated state),
 *  - exposes intent actions (start / submit / recover) for the view.
 *
 * `start()` MUST be called from a user gesture (button click) so iOS unlocks
 * audio — hence it is not auto-invoked on mount.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createVoiceSession,
  type CreateVoiceSessionInput,
} from '@/lib/voice/orchestrator/create-voice-session'
import type { VoiceSessionOrchestrator } from '@/lib/voice/orchestrator/voice-session-orchestrator'
import type { VoiceSessionState } from '@/lib/voice/core/session-state'

export interface VoiceSessionView {
  state: VoiceSessionState
  questionText: string
  questionIndex: number
  isFollowUp: boolean
  transcript: string
  interimTranscript: string
  ttsDegraded: boolean
  error: string | null
  reportId: string | null
  started: boolean
}

const INITIAL_VIEW: VoiceSessionView = {
  state: 'idle',
  questionText: '',
  questionIndex: 0,
  isFollowUp: false,
  transcript: '',
  interimTranscript: '',
  ttsDegraded: false,
  error: null,
  reportId: null,
  started: false,
}

export interface UseVoiceSessionResult {
  view: VoiceSessionView
  /** Call from a click handler (gesture unlock). Brings the session up + asks Q1. */
  start: () => void
  /** Explicitly submit the current answer (mic button). */
  submit: () => void
  /** Retry after a recoverable error (re-asks the current question). */
  recover: () => void
}

export function useVoiceSession(input: CreateVoiceSessionInput): UseVoiceSessionResult {
  const orchRef = useRef<VoiceSessionOrchestrator | null>(null)
  const inputRef = useRef(input)
  const [view, setView] = useState<VoiceSessionView>(INITIAL_VIEW)

  useEffect(() => {
    inputRef.current = input
  })

  useEffect(() => {
    const orch = createVoiceSession(inputRef.current)
    orchRef.current = orch
    const bus = orch.getEventBus()
    let interim = ''
    let disposed = false

    const refresh = () => {
      if (disposed) return
      const s = orch.getSnapshot()
      setView((prev) => ({
        state: s.state,
        questionText: s.questionText,
        questionIndex: s.questionIndex,
        isFollowUp: s.isFollowUp,
        transcript: s.transcript,
        interimTranscript: interim,
        ttsDegraded: s.ttsDegraded,
        error: s.lastError,
        reportId: s.reportId,
        started: prev.started || s.state !== 'idle',
      }))
    }

    const offs = [
      bus.onAny(() => refresh()),
      bus.on('TranscriptUpdated', (e) => {
        interim = e.payload.interim
        refresh()
      }),
      bus.on('TranscriptFinalized', () => {
        interim = ''
        refresh()
      }),
    ]

    return () => {
      disposed = true
      offs.forEach((off) => off())
      void orch.dispose('unmount')
      orchRef.current = null
    }
    // Build exactly once per mount; live values are read via inputRef.
  }, [])

  const start = useCallback(() => {
    setView((v) => ({ ...v, started: true }))
    void orchRef.current?.start()
  }, [])

  const submit = useCallback(() => {
    void orchRef.current?.submitAnswer('button')
  }, [])

  const recover = useCallback(() => {
    void orchRef.current?.recover()
  }, [])

  return { view, start, submit, recover }
}
