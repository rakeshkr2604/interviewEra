'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { InterviewTelemetryContext } from '@/lib/telemetry/interview-telemetry'
import {
  InterviewStartupTimeline,
  readStartupClickDelayMs,
  type StartupStage,
} from '@/lib/telemetry/interview-startup-telemetry'
import {
  getStartupWatchdogDelayMs,
  PREPARE_CLIENT_TIMEOUT_MS,
  STARTUP_POST_READY_TIMEOUT_MS,
} from '@/lib/telemetry/startup-reliability-policy'

type TrackFn = (
  type: 'INTERVIEW_FLOW' | 'VOICE' | 'RECOVERY',
  event: string,
  data?: Record<string, unknown>,
  options?: { critical?: boolean; level?: 'info' | 'warn' | 'error' },
) => void

export interface UseInterviewStartupReliabilityParams {
  interviewId: string
  phase: string
  startupStep: string
  inputMode: string
  questionGenActive: boolean
  track: TrackFn
  telemetryCtx: InterviewTelemetryContext
  onRetryLoad: () => void
  onReconnectPrepare: () => Promise<void>
  onSwitchToTyping: () => void
}

export function useInterviewStartupReliability({
  interviewId,
  phase,
  startupStep,
  inputMode,
  questionGenActive,
  track,
  onRetryLoad,
  onReconnectPrepare,
  onSwitchToTyping,
}: UseInterviewStartupReliabilityParams) {
  const timelineRef = useRef<InterviewStartupTimeline>(new InterviewStartupTimeline())
  const startupCompleteRef = useRef(false)
  const questionGenActiveRef = useRef(questionGenActive)
  const slowWarningEmittedRef = useRef(false)

  useEffect(() => {
    questionGenActiveRef.current = questionGenActive
    if (questionGenActive) {
      slowWarningEmittedRef.current = false
    }
  }, [questionGenActive])

  useEffect(() => {
    const timeline = timelineRef.current
    timeline.bind(interviewId, track, inputMode)
    const navDelay = readStartupClickDelayMs(interviewId)
    if (navDelay != null) {
      timeline.mark('start_interview_clicked', { nav_delay_ms: navDelay, source: 'stash' })
      timeline.mark('session_create_success', { source: 'pre_navigation' })
    }
    timeline.mark('first_question_requested', {
      nav_delay_ms: navDelay,
    })
  }, [interviewId, track, inputMode])

  const mark = useCallback((stage: StartupStage, extra?: Record<string, unknown>) => {
    timelineRef.current?.mark(stage, extra)
  }, [])

  const markInterviewReady = useCallback(() => {
    if (startupCompleteRef.current) return
    startupCompleteRef.current = true
    const metrics = timelineRef.current?.getMetrics() ?? {}
    timelineRef.current?.mark('interview_ready', { metrics })
  }, [])

  useEffect(() => {
    if (phase !== 'loading') {
      markInterviewReady()
    }
  }, [phase, markInterviewReady])

  /** Slow-path telemetry only — recovery UI is shown on confirmed failures (fetchError / audioInitError). */
  useEffect(() => {
    if (startupCompleteRef.current || phase !== 'loading') return

    const delayMs = questionGenActive
      ? Math.min(PREPARE_CLIENT_TIMEOUT_MS - 12_000, 60_000)
      : STARTUP_POST_READY_TIMEOUT_MS

    const timer = window.setTimeout(() => {
      if (startupCompleteRef.current || slowWarningEmittedRef.current) return
      if (questionGenActive && !questionGenActiveRef.current) return
      slowWarningEmittedRef.current = true
      track(
        'RECOVERY',
        questionGenActive ? 'startup_prepare_slow_warning' : 'startup_slow_warning',
        {
          interview_id: interviewId,
          phase,
          startup_step: startupStep,
          elapsed_ms: timelineRef.current?.elapsedMs(),
          question_gen_active: questionGenActiveRef.current,
        },
        { critical: true, level: 'warn' },
      )
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [interviewId, phase, startupStep, track, questionGenActive])

  const restartWatchdog = useCallback(() => {
    startupCompleteRef.current = false
    slowWarningEmittedRef.current = false
    timelineRef.current?.reset()
    timelineRef.current?.bind(interviewId, track, inputMode)
    timelineRef.current?.mark('first_question_requested', {
      nav_delay_ms: readStartupClickDelayMs(interviewId),
      recovery: true,
    })
  }, [interviewId, inputMode, track])

  const handleRetry = useCallback(() => {
    restartWatchdog()
    track('RECOVERY', 'startup_retry_clicked', { interview_id: interviewId }, { critical: true })
    onRetryLoad()
  }, [interviewId, onRetryLoad, restartWatchdog, track])

  const handleReconnect = useCallback(() => {
    restartWatchdog()
    track('RECOVERY', 'startup_reconnect_clicked', { interview_id: interviewId }, { critical: true })
    void onReconnectPrepare()
  }, [interviewId, onReconnectPrepare, restartWatchdog, track])

  const handleSwitchToTyping = useCallback(() => {
    markInterviewReady()
    track('RECOVERY', 'startup_switch_typing_clicked', { interview_id: interviewId }, { critical: true })
    onSwitchToTyping()
  }, [interviewId, markInterviewReady, onSwitchToTyping, track])

  const markFirstQuestionReceived = useCallback((extra?: Record<string, unknown>) => {
    timelineRef.current?.mark('first_question_received', {
      metrics: timelineRef.current?.getMetrics(),
      ...extra,
    })
  }, [])

  return {
    mark,
    timeoutElapsedSeconds: Math.round(getStartupWatchdogDelayMs(questionGenActive) / 1000),
    handleRetry,
    handleReconnect,
    handleSwitchToTyping,
    markFirstQuestionReceived,
  }
}
