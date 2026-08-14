import type { InterviewerId } from '@/lib/config/interviewers'

export function isInterviewerId(value: string | null | undefined): value is InterviewerId {
  return value === 'priya' || value === 'arjun'
}

/**
 * Session/stash interviewer only — never invents Priya/Rohan.
 * Returns null when identity is not yet known (boot race).
 */
export function resolveKnownSpeakVoice(
  sessionInterviewerId: InterviewerId | string | null | undefined,
  stashedInterviewerId?: InterviewerId | string | null,
): InterviewerId | null {
  if (isInterviewerId(sessionInterviewerId)) return sessionInterviewerId
  if (isInterviewerId(stashedInterviewerId)) return stashedInterviewerId
  return null
}

/**
 * Resolve the ElevenLabs voice key for a speak() call.
 *
 * Prefer the loaded session's interviewer_id over the React hook default.
 * The script interview page can call speak via elSpeakRef before React has
 * re-rendered useVoicePlayer with the session voice — reading the session
 * row (already in interviewRef) avoids a priya→arjun flip on Technical/Mixed.
 *
 * Do not use this for SSE sentence-0: the hook fallback is priya and will
 * mis-voice Arjun sessions if called before hydration. Use SessionSpeakVoiceGate.
 */
export function resolveSpeakVoice(
  sessionInterviewerId: InterviewerId | string | null | undefined,
  hookFallback: InterviewerId = 'priya',
): InterviewerId {
  return resolveKnownSpeakVoice(sessionInterviewerId) ?? hookFallback
}

/**
 * Holds the session interviewer identity so the first SSE sentence cannot
 * resolve TTS voice from an unhydrated priya fallback.
 */
export class SessionSpeakVoiceGate {
  private known: InterviewerId | null = null
  private readonly waiters: Array<(id: InterviewerId) => void> = []

  hydrate(id: InterviewerId | string | null | undefined): InterviewerId | null {
    if (!isInterviewerId(id)) return this.known
    if (this.known === id) return id
    this.known = id
    const pending = this.waiters.splice(0)
    for (const waiter of pending) waiter(id)
    return id
  }

  peek(): InterviewerId | null {
    return this.known
  }

  /** Resolves only after a real session/stash interviewer is known. Never priya-by-default. */
  wait(): Promise<InterviewerId> {
    if (this.known) return Promise.resolve(this.known)
    return new Promise((resolve) => {
      this.waiters.push(resolve)
    })
  }
}
