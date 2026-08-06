export type DeepgramHealthReason =
  | 'missing_key'
  | 'missing_project_id'
  | 'auth_failed'
  | 'project_not_found'
  | 'timeout'
  | 'rate_limited'
  | 'server_error'
  | 'slow_response'
  | 'network_error';

/** Human-readable label for dashboard display. */
export function formatDeepgramHealthReason(reason?: DeepgramHealthReason): string | undefined {
  if (!reason) return undefined;
  const labels: Record<DeepgramHealthReason, string> = {
    missing_key: 'API key not configured',
    missing_project_id: 'Project ID not configured',
    auth_failed: 'Authentication failed',
    project_not_found: 'Project not found',
    timeout: 'Probe timed out',
    rate_limited: 'Rate limited',
    server_error: 'Server error',
    slow_response: 'Slow response',
    network_error: 'Network error',
  };
  return labels[reason];
}
