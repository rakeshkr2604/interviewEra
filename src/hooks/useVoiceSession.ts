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
import type { TierCelebrationPayload } from '@/components/retention/TierUnlockCelebrationDialog'
import type { InterviewCompleteRetentionPayload } from '@/lib/retention/interview-complete-retention'
import type { FunnelCompleteGa4Payload } from '@/lib/analytics/funnel-ga4-bridge'
import { trackMockInterviewCompletedGa4 } from '@/lib/analytics/funnel-ga4-bridge'

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
  celebration: TierCelebrationPayload | null
  dismissCelebration: () => void
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
  const [celebration, setCelebration] = useState<TierCelebrationPayload | null>(null)
  const completionTrackedRef = useRef(false)

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

    const handleInterviewCompleted = (payload: {
      reportId?: string | null
      retention?: InterviewCompleteRetentionPayload | null
      funnelComplete?: FunnelCompleteGa4Payload | null
      badgesUnlocked?: string[]
    }) => {
      const reportId = payload.reportId
      if (!reportId) return

      if (payload.funnelComplete && !completionTrackedRef.current) {
        completionTrackedRef.current = true
        void trackMockInterviewCompletedGa4(payload.funnelComplete)
      }

      const retention = payload.retention ?? null
      if (
        typeof window !== 'undefined' &&
        retention &&
        typeof retention.streak === 'number'
      ) {
        window.dispatchEvent(
          new CustomEvent('ie-streak-updated', { detail: { streak: retention.streak } }),
        )
      }

      const href = `/report/${reportId}`
      if (
        retention?.tierUnlocked &&
        typeof retention.newTier === 'number' &&
        retention.newTier != null
      ) {
        setCelebration({
          newTier: retention.newTier,
          newBadges: [...(payload.badgesUnlocked ?? retention.newBadges ?? [])],
          reportHref: href,
          progressHint: retention.progress ?? null,
          nextTierNumber: retention.nextTierNumber ?? null,
          nextTierProgressPercent: retention.nextTierProgressPercent ?? 0,
        })
      }
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
      bus.on('InterviewCompleted', (e) => {
        handleInterviewCompleted({
          reportId: e.payload.reportId,
          retention: e.payload.retention as InterviewCompleteRetentionPayload | null | undefined,
          funnelComplete: e.payload.funnelComplete as FunnelCompleteGa4Payload | null | undefined,
          badgesUnlocked: e.payload.badgesUnlocked,
        })
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

  const dismissCelebration = useCallback(() => {
    setCelebration(null)
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

  return { view, celebration, dismissCelebration, start, submit, recover }
}
