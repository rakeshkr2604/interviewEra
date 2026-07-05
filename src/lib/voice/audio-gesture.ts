/**
 * Centralized audio capability layer for interview sessions.
 * iOS Safari / iOS PWA require an in-document user gesture before
 * speechSynthesis and Web Audio will produce sound.
 */
import { getPlatformContext } from '@/lib/voice/lifecycle-log'
import { interviewFlowLog } from '@/lib/voice/interview-flow-log'

let sharedAudioContext: AudioContext | null = null

/** Dedicated 16 kHz capture contexts (production useMicrophone + v2 driver). */
const captureAudioContexts = new Set<AudioContext>()

/** @internal Test-only reset for module-scoped capture context registry. */
export function __clearCaptureAudioContextsForTests(): void {
  captureAudioContexts.clear()
}

/** Read-only snapshot of live capture AudioContext states (telemetry). */
export function getCaptureAudioContextStates(): string[] {
  const states: string[] = []
  for (const ctx of captureAudioContexts) {
    states.push(ctx.state)
  }
  return states
}

export function registerCaptureAudioContext(ctx: AudioContext): void {
  if (ctx.state !== 'closed') captureAudioContexts.add(ctx)
}

export function unregisterCaptureAudioContext(ctx: AudioContext): void {
  captureAudioContexts.delete(ctx)
}

/** Resume every live capture context after tab/lock-screen backgrounding. */
export async function resumeCaptureAudioContext(): Promise<boolean> {
  let anyRunning = false
  for (const ctx of [...captureAudioContexts]) {
    if (ctx.state === 'closed') {
      captureAudioContexts.delete(ctx)
      continue
    }
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        interviewFlowLog('audio', 'capture_audiocontext_resume_failed', { state: ctx.state })
        continue
      }
    }
    if (ctx.state === 'running') {
      anyRunning = true
      interviewFlowLog('audio', 'capture_audiocontext_resumed', { state: ctx.state })
    }
  }
  return anyRunning
}

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

export function isAndroidInterviewPlatform(): boolean {
  if (typeof window === 'undefined') return false
  return getPlatformContext().platform === 'android'
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
 * Synchronous audio release — call in the same turn as recognition.start()
 * so Chrome keeps the user-gesture activation chain intact.
 */
export function releaseAudioForMicCaptureSync(): void {
  if (typeof window === 'undefined') return
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel()
    } catch {
      /* best-effort */
    }
  }
}

/**
 * Android Chrome often fails recognition.start() when ElevenLabs TTS or
 * speechSynthesis still holds the audio path.
 */
export async function releaseAudioForMicCapture(): Promise<void> {
  if (typeof window === 'undefined') return

  const platform = getPlatformContext()
  interviewFlowLog('audio', 'mic_capture_prep_start', {
    platform: platform.platform,
    browser: platform.browser,
    pwa: platform.pwa,
  })

  releaseAudioForMicCaptureSync()

  const ctx = getSharedInterviewAudioContext()
  if (ctx && ctx.state === 'running' && isAndroidInterviewPlatform()) {
    try {
      await ctx.suspend()
      interviewFlowLog('audio', 'audiocontext_suspended_for_mic', { state: ctx.state })
    } catch {
      /* best-effort */
    }
  }

  const delayMs = isAndroidInterviewPlatform() ? 480 : 140
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs)
  })

  interviewFlowLog('audio', 'mic_capture_prep_done', { delayMs })
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
