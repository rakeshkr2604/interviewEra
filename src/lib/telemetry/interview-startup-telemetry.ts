/**
 * Interview startup reliability telemetry.
 * Traces the path from session page mount → first question visible/audible.
 * Every event carries ISO timestamp + elapsed ms from timeline origin.
 */
import { getPlatformContext } from '@/lib/voice/lifecycle-log'

export type StartupStage =
  | 'origin'
  | 'first_question_requested'
  | 'first_question_received'
  | 'audio_unlock_started'
  | 'audio_unlock_success'
  | 'audio_unlock_failed'
  | 'mic_permission_started'
  | 'mic_permission_granted'
  | 'mic_permission_denied'
  | 'deepgram_token_requested'
  | 'deepgram_token_success'
  | 'deepgram_token_failed'
  | 'deepgram_connect_started'
  | 'deepgram_connect_success'
  | 'deepgram_connect_failed'
  | 'session_create_started'
  | 'session_create_success'
  | 'session_create_failed'
  | 'start_interview_clicked'
  | 'first_question_timeout'
  | 'tts_started'
  | 'tts_completed'
  | 'tts_failed'
  | 'interview_ready'

export interface StartupFunnelReport {
  start_click: boolean
  session_created: boolean
  question_ready: boolean
  first_question_played: boolean
  interview_ready: boolean
  conversion_pct: {
    click_to_session: number | null
    session_to_question: number | null
    question_to_tts: number | null
    tts_to_ready: number | null
    click_to_ready: number | null
  }
}

function pct(numerator: boolean, denominator: boolean): number | null {
  if (!denominator) return null
  return Math.round((numerator ? 1 : 0) * 1000) / 10
}

function stepPct(completed: boolean, priorCompleted: boolean): number | null {
  if (!priorCompleted) return null
  return Math.round((completed ? 1 : 0) * 1000) / 10
}

/** Compute end-to-end startup funnel conversion from recorded stages. */
export function computeStartupFunnel(completedStages: ReadonlySet<StartupStage>): StartupFunnelReport {
  const start_click = completedStages.has('start_interview_clicked')
  const session_created = completedStages.has('session_create_success')
  const question_ready = completedStages.has('first_question_received')
  const first_question_played =
    completedStages.has('tts_started') || completedStages.has('tts_completed')
  const interview_ready = completedStages.has('interview_ready')

  return {
    start_click,
    session_created,
    question_ready,
    first_question_played,
    interview_ready,
    conversion_pct: {
      click_to_session: stepPct(session_created, start_click),
      session_to_question: stepPct(question_ready, session_created),
      question_to_tts: stepPct(first_question_played, question_ready),
      tts_to_ready: stepPct(interview_ready, first_question_played),
      click_to_ready: pct(interview_ready, start_click),
    },
  }
}

export interface StartupTimingMetrics {
  time_to_mic: number | null
  time_to_connect: number | null
  time_to_first_question: number | null
  time_to_interview_ready: number | null
}

export interface StartupTelemetryContext {
  interview_id: string
  session_id: string
  mode?: string
}

type TrackFn = (
  type: 'INTERVIEW_FLOW' | 'VOICE' | 'RECOVERY',
  event: string,
  data?: Record<string, unknown>,
  options?: { critical?: boolean; level?: 'info' | 'warn' | 'error' },
) => void

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function isoTimestamp(): string {
  return new Date().toISOString()
}

export function startupLog(event: string, data?: Record<string, unknown>): void {
  console.log('[startup]', { event, ts: isoTimestamp(), ...getPlatformContext(), ...(data ?? {}) })
}

export function startupErrorLog(event: string, data?: Record<string, unknown>): void {
  console.warn('[startup-error]', { event, ts: isoTimestamp(), ...getPlatformContext(), ...(data ?? {}) })
}

export function firstQuestionLog(event: string, data?: Record<string, unknown>): void {
  console.log('[first-question]', { event, ts: isoTimestamp(), ...getPlatformContext(), ...(data ?? {}) })
}

export function sessionInitLog(event: string, data?: Record<string, unknown>): void {
  console.log('[session-init]', { event, ts: isoTimestamp(), ...getPlatformContext(), ...(data ?? {}) })
}

export class InterviewStartupTimeline {
  private originMs: number
  private stageMs = new Map<StartupStage, number>()
  private trackFn: TrackFn | null = null
  private ctx: StartupTelemetryContext = { interview_id: '', session_id: '' }

  constructor(originMs?: number) {
    this.originMs = originMs ?? nowMs()
    this.stageMs.set('origin', this.originMs)
  }

  bind(interviewId: string, track: TrackFn, mode?: string): void {
    this.ctx = { interview_id: interviewId, session_id: interviewId, mode }
    this.trackFn = track
  }

  mark(stage: StartupStage, extra?: Record<string, unknown>): void {
    const at = nowMs()
    if (!this.stageMs.has(stage)) {
      this.stageMs.set(stage, at)
    }
    const elapsed_ms = Math.round(at - this.originMs)
    const payload = {
      stage,
      elapsed_ms,
      timestamp: isoTimestamp(),
      ...getPlatformContext(),
      ...this.ctx,
      ...(extra ?? {}),
    }

    if (stage.includes('failed') || stage === 'first_question_timeout') {
      startupErrorLog(stage, payload)
    } else if (stage === 'interview_ready') {
      startupLog(stage, { ...payload, funnel: this.getFunnelReport() })
    } else if (
      stage === 'first_question_requested' ||
      stage === 'first_question_received'
    ) {
      firstQuestionLog(stage, payload)
    } else if (stage.startsWith('session_create')) {
      sessionInitLog(stage, payload)
    } else {
      startupLog(stage, payload)
    }

    this.trackFn?.('INTERVIEW_FLOW', stage, payload, {
      critical:
        stage.includes('failed') ||
        stage === 'first_question_timeout' ||
        stage === 'interview_ready',
      level: stage.includes('failed') || stage === 'first_question_timeout' ? 'warn' : 'info',
    })

    if (stage === 'interview_ready') {
      this.trackFn?.(
        'INTERVIEW_FLOW',
        'startup_funnel_report',
        { ...payload, funnel: this.getFunnelReport() },
        { critical: true, level: 'info' },
      )
    }
  }

  getMetrics(): StartupTimingMetrics {
    const t = (stage: StartupStage) => {
      const v = this.stageMs.get(stage)
      return v != null ? Math.round(v - this.originMs) : null
    }
    const micGranted = this.stageMs.get('mic_permission_granted')
    const micStarted = this.stageMs.get('mic_permission_started')
    const time_to_mic =
      micGranted != null && micStarted != null
        ? Math.round(micGranted - micStarted)
        : micGranted != null
          ? t('mic_permission_granted')
          : null

    const connectSuccess = this.stageMs.get('deepgram_connect_success')
    const connectStarted = this.stageMs.get('deepgram_connect_started')
    const time_to_connect =
      connectSuccess != null && connectStarted != null
        ? Math.round(connectSuccess - connectStarted)
        : connectSuccess != null
          ? t('deepgram_connect_success')
          : null

    return {
      time_to_mic,
      time_to_connect,
      time_to_first_question: t('first_question_received'),
      time_to_interview_ready: t('interview_ready'),
    }
  }

  elapsedMs(): number {
    return Math.round(nowMs() - this.originMs)
  }

  reset(): void {
    this.originMs = nowMs()
    this.stageMs.clear()
    this.stageMs.set('origin', this.originMs)
  }

  getCompletedStages(): ReadonlySet<StartupStage> {
    return new Set(this.stageMs.keys())
  }

  getFunnelReport(): StartupFunnelReport {
    return computeStartupFunnel(this.getCompletedStages())
  }
}

/** Shared helper for pre-navigation Start Interview click (onboarding / interview/new). */
export async function runStartInterviewWithTelemetry(opts: {
  track?: TrackFn
  interviewIdPlaceholder?: string
  unlockAudio: () => void
  createSession: () => Promise<{ ok: boolean; interviewId?: string; error?: string; preparing?: boolean }>
}): Promise<{ ok: boolean; interviewId?: string; error?: string; preparing?: boolean }> {
  const timeline = new InterviewStartupTimeline()
  const placeholder = opts.interviewIdPlaceholder ?? 'pending'
  if (opts.track) timeline.bind(placeholder, opts.track)

  timeline.mark('start_interview_clicked')

  timeline.mark('audio_unlock_started')
  try {
    opts.unlockAudio()
    timeline.mark('audio_unlock_success')
  } catch (err) {
    timeline.mark('audio_unlock_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  timeline.mark('session_create_started')
  try {
    const result = await opts.createSession()
    if (result.ok && result.interviewId) {
      timeline.bind(result.interviewId, opts.track ?? (() => {}))
      timeline.mark('session_create_success', {
        preparing: result.preparing ?? false,
        metrics: timeline.getMetrics(),
      })
    } else {
      timeline.mark('session_create_failed', { error: result.error ?? 'unknown' })
    }
    return result
  } catch (err) {
    timeline.mark('session_create_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'Network error. Please check your connection and try again.' }
  }
}

export function stashStartupClickMeta(interviewId: string): void {
  try {
    sessionStorage.setItem(
      `ie-startup-click:${interviewId}`,
      JSON.stringify({ ts: Date.now() }),
    )
  } catch {
    /* best-effort */
  }
}

export function readStartupClickDelayMs(interviewId: string): number | null {
  try {
    const raw = sessionStorage.getItem(`ie-startup-click:${interviewId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ts?: number }
    if (typeof parsed.ts !== 'number') return null
    return Date.now() - parsed.ts
  } catch {
    return null
  }
}
