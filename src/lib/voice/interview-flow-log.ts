/**
 * Structured interview flow telemetry (client console).
 * Categories: session, audio, avatar, tts, lipsync, voice, timer.
 */
import { getPlatformContext } from '@/lib/voice/lifecycle-log'

export type FlowCategory =
  | 'session'
  | 'audio'
  | 'avatar'
  | 'tts'
  | 'lipsync'
  | 'voice'
  | 'timer'

export interface FlowLogContext {
  interviewId?: string
  questionIndex?: number
  phase?: string
  [key: string]: unknown
}

export function interviewFlowLog(
  category: FlowCategory,
  event: string,
  ctx?: FlowLogContext,
): void {
  const platform = getPlatformContext()
  const payload = {
    ...platform,
    ts: Date.now(),
    ...(ctx ?? {}),
  }
  console.log(`[${category}] ${event}`, payload)
}
