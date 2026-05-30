/**
 * Explicit runtime phases for the avatar interview session.
 * Single source of truth — no inferred transitions from timers alone.
 */
export type RuntimePhase =
  | 'loading'
  | 'awaiting_audio_unlock'
  | 'avatar_speaking'
  | 'avatar_finished'
  | 'candidate_answering'
  | 'submitting'
  | 'feedback'
  | 'completed'

/** Phases where the answer timer may run */
export function isAnsweringPhase(phase: RuntimePhase): boolean {
  return phase === 'candidate_answering'
}

/** Phases where interviewer TTS / avatar video should be active */
export function isInterviewerSpeakingPhase(phase: RuntimePhase): boolean {
  return phase === 'avatar_speaking'
}

/** Map runtime phase → draft persistence phase (subset) */
export function toDraftPhase(
  phase: RuntimePhase,
): 'avatar_speaking' | 'candidate_answering' | 'submitting' | 'feedback' | null {
  switch (phase) {
    case 'awaiting_audio_unlock':
    case 'avatar_speaking':
    case 'avatar_finished':
      return 'avatar_speaking'
    case 'candidate_answering':
      return 'candidate_answering'
    case 'submitting':
      return 'submitting'
    case 'feedback':
      return 'feedback'
    default:
      return null
  }
}

/** User-visible label for the progress panel center ring */
export function progressRingLabel(phase: RuntimePhase): string {
  switch (phase) {
    case 'awaiting_audio_unlock':
      return 'Tap to listen'
    case 'avatar_speaking':
      return 'Preparing…'
    case 'avatar_finished':
      return 'Your turn'
    case 'submitting':
      return 'Scoring…'
    case 'feedback':
      return 'Done'
    default:
      return ''
  }
}
