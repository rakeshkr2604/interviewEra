/**
 * Authoritative reasons that may end the interviewer turn and start the answer timer.
 */
export type AvatarAnsweringReason = 'audio_completed' | 'user_continue' | 'voice_disabled'

export function isAuthoritativeAnsweringReason(
  reason: string,
): reason is AvatarAnsweringReason {
  return (
    reason === 'audio_completed' ||
    reason === 'user_continue' ||
    reason === 'voice_disabled'
  )
}
