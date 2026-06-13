/**
 * Pure policy helpers for interview startup reliability.
 * Kept free of React so watchdog / recovery rules are unit-testable.
 */

/** Non-generation startup steps (fetch, audio probe, handoff). */
export const STARTUP_POST_READY_TIMEOUT_MS = 20_000

/**
 * Client prepare poll ceiling — must match {@link useInterviewPrepare} loop budget (~72s).
 * Used as the watchdog while question generation is actively running.
 */
export const PREPARE_CLIENT_TIMEOUT_MS = 72_000

export type StartupFailureKind = 'none' | 'network' | 'backend' | 'prepare_timeout'

export function getStartupWatchdogDelayMs(questionGenActive: boolean): number {
  return questionGenActive ? PREPARE_CLIENT_TIMEOUT_MS : STARTUP_POST_READY_TIMEOUT_MS
}

export function shouldShowStartupRecovery(opts: {
  questionGenActive: boolean
  showTimeoutRecovery: boolean
  confirmedFailure: StartupFailureKind
  phase: string
}): boolean {
  if (opts.phase !== 'loading') return false
  if (opts.questionGenActive) return false
  if (opts.confirmedFailure !== 'none') return true
  return opts.showTimeoutRecovery
}

export function getStartupLoadingExplanation(opts: {
  questionGenActive: boolean
  startupStep: string
  audioInitError: string | null
  loadingMessage: string
}): string {
  if (opts.questionGenActive) {
    return 'Generating interview questions…'
  }
  switch (opts.startupStep) {
    case 'fetching_interview':
      return 'Loading your interview…'
    case 'questions_ready':
      return 'Preparing audio pipeline…'
    case 'initializing_audio':
      return opts.audioInitError
        ? 'Audio setup failed — please retry'
        : 'Initializing voice playback…'
    case 'speech_ready':
      return 'Almost ready…'
    case 'interview_ready':
      return 'Starting interview…'
    default:
      return opts.loadingMessage
  }
}

export function getStartupSubtext(opts: {
  questionGenActive: boolean
  showRecovery: boolean
  audioInitError: string | null
}): string | null {
  if (opts.audioInitError) return null
  if (opts.questionGenActive) {
    return 'Personalizing questions from your resume — this can take up to a minute.'
  }
  if (opts.showRecovery) return null
  return 'This usually takes a few seconds — stay on this page.'
}

export function classifyPrepareError(error: string): StartupFailureKind {
  const lower = error.toLowerCase()
  if (lower.includes('network') || lower.includes('connection') || lower.includes('could not start question generation')) {
    return 'network'
  }
  if (lower.includes('taking longer than expected')) {
    return 'prepare_timeout'
  }
  return 'backend'
}

export function mapFetchErrorToFailureKind(message: string): StartupFailureKind {
  const lower = message.toLowerCase()
  if (lower.includes('network') || lower.includes('connection') || lower.includes('failed to load')) {
    return 'network'
  }
  if (lower.includes('took too long') || lower.includes('taking longer')) {
    return 'prepare_timeout'
  }
  return 'backend'
}
