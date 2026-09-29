/**
 * Pure policy helpers for interview startup reliability.
 * Kept free of React so watchdog / recovery rules are unit-testable.
 */

/** Non-generation startup steps (fetch, audio probe, handoff). */
export const STARTUP_POST_READY_TIMEOUT_MS = 20_000

/**
 * Legacy V1 prepare poll ceiling (~72s). Retained as a telemetry constant reference.
 * Used as the watchdog while question generation is actively running.
 */
export const PREPARE_CLIENT_TIMEOUT_MS = 72_000

export type StartupFailureKind = 'none' | 'network' | 'backend' | 'prepare_timeout'

/** Staged copy shown while AI question generation runs — advances on a timer for perceived progress. */
export const QUESTION_GEN_PROGRESS_STAGES = [
  {
    id: 'profile',
    label: 'Reading your profile',
    detail: 'Skills, projects, and experience from your resume',
  },
  {
    id: 'craft',
    label: 'Crafting your questions',
    detail: 'Tailored to your target role and difficulty',
  },
  {
    id: 'calibrate',
    label: 'Balancing question types',
    detail: 'Technical, behavioral, and situational mix',
  },
  {
    id: 'finalize',
    label: 'Almost ready',
    detail: 'Final checks before your session starts',
  },
] as const

/** Time per stage before advancing to the next (last stage repeats until ready). */
export const QUESTION_GEN_STAGE_DURATION_MS = 8_000

export function getQuestionGenStageIndex(elapsedMs: number): number {
  const idx = Math.floor(Math.max(0, elapsedMs) / QUESTION_GEN_STAGE_DURATION_MS)
  return Math.min(idx, QUESTION_GEN_PROGRESS_STAGES.length - 1)
}

export function getQuestionGenHeadline(stageIndex: number): string {
  const stage = QUESTION_GEN_PROGRESS_STAGES[stageIndex] ?? QUESTION_GEN_PROGRESS_STAGES[0]
  return `${stage.label}…`
}

export function getQuestionGenSubtext(): string {
  return 'Usually ready in 15–30 seconds — stay on this page.'
}

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
    return getQuestionGenHeadline(0)
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
    return getQuestionGenSubtext()
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
