/**
 * Deepgram STT provider health — used by /api/admin/system.
 *
 * Probe: GET /v1/projects/{DEEPGRAM_PROJECT_ID} with DEEPGRAM_API_KEY.
 * Confirms key + project are configured and accepted by Deepgram (same
 * credentials used to mint ephemeral listen keys in /api/stt/token).
 */

import type { DeepgramHealthReason } from '@/lib/voice/deepgram-admin-health-labels';

export type { DeepgramHealthReason } from '@/lib/voice/deepgram-admin-health-labels';
export { formatDeepgramHealthReason } from '@/lib/voice/deepgram-admin-health-labels';

export type DeepgramHealthStatus = 'healthy' | 'degraded' | 'offline';

export interface DeepgramHealthResult {
  status: DeepgramHealthStatus;
  latency_ms: number;
  reason?: DeepgramHealthReason;
}

const PROBE_TIMEOUT_MS = 8_000;
const HEALTHY_LATENCY_MS = 3_000;

function resolveDeepgramConfig(): { apiKey: string; projectId: string } | null {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim() ?? '';
  const projectId = process.env.DEEPGRAM_PROJECT_ID?.trim() ?? '';
  if (!apiKey || !projectId) return null;
  return { apiKey, projectId };
}

/** Run Deepgram health classification for the admin system panel. */
export async function checkDeepgramHealth(): Promise<DeepgramHealthResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY?.trim() ?? '';
  const projectId = process.env.DEEPGRAM_PROJECT_ID?.trim() ?? '';

  if (!apiKey) {
    return { status: 'offline', latency_ms: 0, reason: 'missing_key' };
  }
  if (!projectId) {
    return { status: 'offline', latency_ms: 0, reason: 'missing_project_id' };
  }

  const t0 = Date.now();
  try {
    const res = await fetch(`https://api.deepgram.com/v1/projects/${projectId}`, {
      method: 'GET',
      headers: {
        Authorization: `Token ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: 'no-store',
    });

    const latency_ms = Date.now() - t0;

    if (res.status === 401 || res.status === 403) {
      return { status: 'offline', latency_ms, reason: 'auth_failed' };
    }
    if (res.status === 404) {
      return { status: 'offline', latency_ms, reason: 'project_not_found' };
    }
    if (res.status === 429) {
      return { status: 'degraded', latency_ms, reason: 'rate_limited' };
    }
    if (res.status >= 500) {
      return { status: 'degraded', latency_ms, reason: 'server_error' };
    }
    if (!res.ok) {
      return { status: 'degraded', latency_ms, reason: 'server_error' };
    }

    if (latency_ms > HEALTHY_LATENCY_MS) {
      return { status: 'degraded', latency_ms, reason: 'slow_response' };
    }

    return { status: 'healthy', latency_ms };
  } catch (err) {
    const latency_ms = Date.now() - t0;
    const isTimeout =
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      status: 'offline',
      latency_ms,
      reason: isTimeout ? 'timeout' : 'network_error',
    };
  }
}

/** Exported for tests — config presence only. */
export function hasDeepgramConfig(): boolean {
  return resolveDeepgramConfig() !== null;
}
