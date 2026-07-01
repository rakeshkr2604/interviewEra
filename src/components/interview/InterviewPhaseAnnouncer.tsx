'use client'

import type { RuntimePhase } from '@/lib/interview/runtime-phase'

/** Assistive-technology copy for each interview runtime phase (presentation layer). */
function interviewPhaseAnnouncement(phase: RuntimePhase): string {
  switch (phase) {
    case 'loading':
      return 'Preparing interview'
    case 'awaiting_audio_unlock':
      return 'Tap to hear the question'
    case 'avatar_speaking':
      return 'Interviewer is speaking'
    case 'avatar_finished':
      return 'Your turn to answer'
    case 'candidate_answering':
      return 'Answer the question'
    case 'submitting':
      return 'Scoring your answer'
    case 'feedback':
      return 'Interviewer feedback'
    case 'completed':
      return 'Interview complete'
    default:
      return ''
  }
}

interface InterviewPhaseAnnouncerProps {
  phase: RuntimePhase
}

/**
 * Screen-reader live region for interview phase transitions.
 * Consumes runtime phase only; announcement wording lives in the UI layer.
 */
export function InterviewPhaseAnnouncer({ phase }: InterviewPhaseAnnouncerProps) {
  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {interviewPhaseAnnouncement(phase)}
    </p>
  )
}
