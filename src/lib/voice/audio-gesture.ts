/**
 * Centralized audio capability layer for interview sessions.
 * iOS Safari / iOS PWA require an in-document user gesture before
 * speechSynthesis and Web Audio will produce sound.
 */
import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'

let sharedAudioContext: AudioContext | null = null

/**
 * True when TTS/Web Audio needs an in-page tap before the first speak().
 * All iOS browsers (Safari, CriOS, Edge, Firefox, in-app WebViews) use WebKit
 * and share the same autoplay / speechSynthesis gesture rules.
 */
export function needsAudioGestureUnlock(): boolean {
  if (typeof window === 'undefined') return false
  return getPlatformContext().platform === 'ios'
}

export function isIOSInterviewPlatform(): boolean {
  return needsAudioGestureUnlock()
}

/** Reused across ElevenLabs utterances in one session (Chrome context limit). */
export function getSharedInterviewAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new Ctor()
  }
  return sharedAudioContext
}

export async function resumeSharedInterviewAudioContext(): Promise<boolean> {
  const ctx = getSharedInterviewAudioContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      interviewFlowLog('audio', 'audiocontext_resume_failed', { state: ctx.state })
      return false
    }
  }
  const running = ctx.state === 'running'
  if (running) interviewFlowLog('audio', 'audiocontext_resumed', { state: ctx.state })
  return running
}

export function closeSharedInterviewAudioContext(): void {
  if (!sharedAudioContext) return
  void sharedAudioContext.close().catch(() => {})
  sharedAudioContext = null
  interviewFlowLog('audio', 'audiocontext_closed', {})
}

/**
 * Consume a user-gesture token for speech + Web Audio.
 * Call synchronously inside click/tap handlers.
 */
export function unlockAudioForInterview(): void {
  if (typeof window === 'undefined') return

  interviewFlowLog('audio', 'gesture_unlock_invoked', {})

  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
      const prime = new SpeechSynthesisUtterance('\u200b')
      prime.volume = 0.01
      prime.rate = 2
      prime.lang = 'en-US'
      window.speechSynthesis.speak(prime)
      window.speechSynthesis.getVoices()
      interviewFlowLog('audio', 'speech_synthesis_primed', {})
    } catch (err) {
      interviewFlowLog('audio', 'speech_synthesis_prime_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  void resumeSharedInterviewAudioContext()
}
