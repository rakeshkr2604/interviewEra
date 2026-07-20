import type { InterviewerId } from '@/lib/config/interviewers'

/**
 * Resolve the ElevenLabs voice key for a speak() call.
 *
 * Prefer the loaded session's interviewer_id over the React hook default.
 * The script interview page can call speak via elSpeakRef before React has
 * re-rendered useVoicePlayer with the session voice — reading the session
 * row (already in interviewRef) avoids a priya→arjun flip on Technical/Mixed.
 */
export function resolveSpeakVoice(
  sessionInterviewerId: InterviewerId | string | null | undefined,
  hookFallback: InterviewerId = 'priya',
): InterviewerId {
  if (sessionInterviewerId === 'priya' || sessionInterviewerId === 'arjun') {
    return sessionInterviewerId
  }
  return hookFallback
}
