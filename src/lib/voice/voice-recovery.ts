/**
 * Voice interview recovery after page refresh.
 * Mic permission, AudioContext, and STT sessions are lost on reload — this module
 * drives explicit user-facing recovery instead of silently downgrading to Type mode.
 */
import type { InterviewDraft } from '@/lib/session/interview-draft'
import type { InterviewInputMode } from '@/lib/voice/browser-capabilities'
import { getPlatformContext } from '@/lib/voice/lifecycle-log'

export type VoiceRecoveryPhase = 'idle' | 'pending' | 'resuming' | 'failed'

export type SavedVoiceMode = 'voice' | 'deepgram'

export interface VoiceRecoveryState {
  phase: VoiceRecoveryPhase
  savedMode: SavedVoiceMode
  transcript: string
  error: string | null
}

export const VOICE_RECOVERY_INITIAL: VoiceRecoveryState = {
  phase: 'idle',
  savedMode: 'voice',
  transcript: '',
  error: null,
}

export function isSavedVoiceMode(mode: InterviewInputMode): mode is SavedVoiceMode {
  return mode === 'voice' || mode === 'deepgram'
}

/** True when draft was saved in Voice or AI Voice and should show recovery UX. */
export function shouldOfferVoiceRecovery(draft: InterviewDraft, questionIndex: number): boolean {
  if (draft.questionIndex !== questionIndex) return false
  if (!isSavedVoiceMode(draft.inputMode)) return false
  if (draft.phase !== 'candidate_answering') return false
  // Empty transcript — normal mic-start flow; skip resume banner noise.
  if (!draft.transcript.trim()) return false
  return true
}

export function buildVoiceRecoveryState(draft: InterviewDraft): VoiceRecoveryState {
  if (!isSavedVoiceMode(draft.inputMode)) {
    throw new Error('buildVoiceRecoveryState requires a voice or deepgram draft')
  }
  return {
    phase: 'pending',
    savedMode: draft.inputMode,
    transcript: draft.transcript,
    error: null,
  }
}

/** Whether mic/STT must stay disarmed during an in-flight resume gesture. */
export function isVoiceRecoveryBlockingMic(state: VoiceRecoveryState): boolean {
  return state.phase === 'resuming'
}

/** Structured console logs for production grep. */
export function logVoiceRecovery(event: string, data?: Record<string, unknown>): void {
  const ctx = getPlatformContext()
  console.log('[voice-recovery]', { event, ...ctx, ...(data ?? {}) })
}

export function logVoiceRecoverySuccess(data?: Record<string, unknown>): void {
  const ctx = getPlatformContext()
  console.log('[voice-recovery-success]', { ...ctx, ...(data ?? {}) })
}

export function logVoiceRecoveryFailure(data?: Record<string, unknown>): void {
  const ctx = getPlatformContext()
  console.warn('[voice-recovery-failure]', { ...ctx, ...(data ?? {}) })
}

export type VoiceRecoveryAnalyticsEvent =
  | 'voice_resume_banner_shown'
  | 'voice_resume_clicked'
  | 'voice_resume_success'
  | 'voice_resume_failed'
  | 'voice_resume_continue_typing'

export interface VoiceRecoveryAnalyticsPayload extends Record<string, unknown> {
  interview_id: string
  session_id: string
  mode: SavedVoiceMode
  browser: string
  os: string
  error?: string
  transcript_len?: number
}

export function buildVoiceRecoveryAnalyticsPayload(
  interviewId: string,
  mode: SavedVoiceMode,
  extra?: Record<string, unknown>,
): VoiceRecoveryAnalyticsPayload {
  const ctx = getPlatformContext()
  return {
    interview_id: interviewId,
    session_id: interviewId,
    mode,
    browser: ctx.browser,
    os: ctx.platform,
    ...extra,
  }
}

/** Page was reloaded (not first navigation). Best-effort — draft restore is authoritative. */
export function wasPageReloaded(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (nav?.type === 'reload') return true
  } catch {
    /* ignore */
  }
  const legacy = (performance as Performance & { navigation?: { type?: number } }).navigation
  return legacy?.type === 1
}
