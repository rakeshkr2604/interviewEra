/** Shared TTS / voice-player playback lifecycle callbacks. */
export interface PlaybackCallbacks {
  onPlaybackStarted?: () => void
  onPlaybackComplete?: () => void
  onPlaybackFailed?: (message?: string) => void
}

export function normalizePlaybackArg(
  arg?: (() => void) | PlaybackCallbacks,
): PlaybackCallbacks {
  if (!arg) return {}
  if (typeof arg === 'function') return { onPlaybackComplete: arg }
  return arg
}
