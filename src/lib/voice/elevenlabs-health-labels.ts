export type ElevenLabsHealthReason =
  | 'missing_key'
  | 'invalid_key'
  | 'auth_failed'
  | 'quota_exhausted'
  | 'quota_low'
  | 'timeout'
  | 'rate_limited'
  | 'server_error'
  | 'scope_limited'
  | 'tts_probe_failed'
  | 'slow_response'
  | 'network_error';

/** Human-readable label for dashboard display. */
export function formatElevenLabsHealthReason(reason?: ElevenLabsHealthReason): string | undefined {
  if (!reason) return undefined;
  const labels: Record<ElevenLabsHealthReason, string> = {
    missing_key: 'API key not configured',
    invalid_key: 'API key invalid',
    auth_failed: 'Authentication failed',
    quota_exhausted: 'Quota exhausted',
    quota_low: 'Quota low',
    timeout: 'Probe timed out',
    rate_limited: 'Rate limited',
    server_error: 'Server error',
    scope_limited: 'TTS OK · account endpoint restricted',
    tts_probe_failed: 'TTS probe failed',
    slow_response: 'Slow response',
    network_error: 'Network error',
  };
  return labels[reason];
}
