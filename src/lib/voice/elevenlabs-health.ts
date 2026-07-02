/**
 * ElevenLabs provider health — used by /api/admin/system.
 *
 * Primary probe: GET /v1/user (quota + auth).
 * Fallback probe: POST /v1/text-to-speech/{voiceId} when the key is scope-limited.
 * Corroboration: recent voice_usage_logs TTS success rate (optional).
 */

import { createServiceClient } from '@/lib/supabase/server';
import {
  ELEVENLABS_VOICE_IDS,
  resolveElevenLabsModelId,
} from '@/lib/voice/elevenlabs-voices';
import type { ElevenLabsHealthReason } from '@/lib/voice/elevenlabs-health-labels';
import { resolveElevenLabsApiKey } from '@/lib/voice/elevenlabs-health-shared';

export type { ElevenLabsHealthReason } from '@/lib/voice/elevenlabs-health-labels';
export { formatElevenLabsHealthReason } from '@/lib/voice/elevenlabs-health-labels';
export { resolveElevenLabsApiKey } from '@/lib/voice/elevenlabs-health-shared';

export type ElevenLabsHealthStatus = 'healthy' | 'degraded' | 'offline';

export interface ElevenLabsHealthResult {
  status: ElevenLabsHealthStatus;
  latency_ms: number;
  reason?: ElevenLabsHealthReason;
  quota_remaining_pct?: number;
  tts_recent_success_rate?: number;
}

const USER_ENDPOINT = 'https://api.elevenlabs.io/v1/user';
const PROBE_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 500;
const MAX_ATTEMPTS = 2;
const HEALTHY_LATENCY_MS = 3_000;
const QUOTA_WARNING_PCT = 10;

interface UserSubscription {
  character_count?: number;
  character_limit?: number;
}

interface UserResponseBody {
  subscription?: UserSubscription;
}

interface ProbeAttemptResult {
  ok: boolean;
  status: number | null;
  latency_ms: number;
  error_type: string | null;
  body?: UserResponseBody;
  permission_denied?: boolean;
}

function isRetryableStatus(status: number | null, errorType: string | null): boolean {
  if (errorType === 'timeout' || errorType === 'network_error') return true;
  if (status !== null && status >= 500) return true;
  return false;
}

function isPermissionDenied(status: number, bodyText: string): boolean {
  if (status === 403) return true;
  if (status !== 401) return false;
  const lower = bodyText.toLowerCase();
  return lower.includes('permission') || lower.includes('missing the permission');
}

async function probeUserEndpoint(apiKey: string): Promise<ProbeAttemptResult> {
  const t0 = Date.now();
  let last: ProbeAttemptResult = {
    ok: false,
    status: null,
    latency_ms: 0,
    error_type: 'network_error',
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const attemptT0 = Date.now();
    try {
      const res = await fetch(USER_ENDPOINT, {
        headers: { 'xi-api-key': apiKey },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      const bodyText = await res.text();
      const latency_ms = Date.now() - attemptT0;

      let body: UserResponseBody | undefined;
      try {
        body = JSON.parse(bodyText) as UserResponseBody;
      } catch {
        body = undefined;
      }

      last = {
        ok: res.ok,
        status: res.status,
        latency_ms,
        error_type: res.ok ? null : 'http_error',
        body,
        permission_denied: !res.ok && isPermissionDenied(res.status, bodyText),
      };

      if (res.ok || !isRetryableStatus(res.status, last.error_type)) {
        last.latency_ms = Date.now() - t0;
        return last;
      }
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'TimeoutError';
      last = {
        ok: false,
        status: null,
        latency_ms: Date.now() - attemptT0,
        error_type: isTimeout ? 'timeout' : 'network_error',
      };
      if (!isRetryableStatus(null, last.error_type)) break;
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  last.latency_ms = Date.now() - t0;
  return last;
}

async function probeTtsEndpoint(apiKey: string): Promise<{ ok: boolean; status: number | null; latency_ms: number }> {
  const t0 = Date.now();
  const voiceId = ELEVENLABS_VOICE_IDS.priya;
  const modelId = resolveElevenLabsModelId();

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        Accept: 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: '.',
        model_id: modelId,
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });

    return { ok: res.ok, status: res.status, latency_ms: Date.now() - t0 };
  } catch {
    return { ok: false, status: null, latency_ms: Date.now() - t0 };
  }
}

function computeQuotaRemainingPct(subscription?: UserSubscription): number | undefined {
  const used = subscription?.character_count;
  const limit = subscription?.character_limit;
  if (typeof used !== 'number' || typeof limit !== 'number' || limit <= 0) return undefined;
  const remaining = Math.max(0, limit - used);
  return Math.round((remaining / limit) * 100);
}

async function fetchRecentTtsSuccessRate(): Promise<number | undefined> {
  try {
    const since = new Date(Date.now() - 30 * 60_000).toISOString();
    const svc = createServiceClient();
    const { data, error } = await svc
      .from('voice_usage_logs')
      .select('success')
      .eq('provider', 'elevenlabs')
      .eq('voice_type', 'tts')
      .gte('created_at', since);

    if (error || !data?.length) return undefined;
    const successes = data.filter((row) => row.success).length;
    return +(successes / data.length).toFixed(2);
  } catch {
    return undefined;
  }
}

function logHealthCheck(payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ event: 'elevenlabs_health_check', provider: 'elevenlabs', ...payload }));
}

/** Run ElevenLabs health classification for the admin system panel. */
export async function checkElevenLabsHealth(): Promise<ElevenLabsHealthResult> {
  const apiKey = resolveElevenLabsApiKey();
  if (!apiKey) {
    const result: ElevenLabsHealthResult = {
      status: 'offline',
      latency_ms: 0,
      reason: 'missing_key',
    };
    logHealthCheck({
      endpoint: USER_ENDPOINT,
      status: null,
      latency_ms: 0,
      attempt: 0,
      timeout_ms: PROBE_TIMEOUT_MS,
      error_type: 'missing_key',
      response_code: null,
      classification: result.status,
      reason: result.reason,
    });
    return result;
  }

  const [userProbe, ttsRecentSuccessRate] = await Promise.all([
    probeUserEndpoint(apiKey),
    fetchRecentTtsSuccessRate(),
  ]);

  const quotaRemainingPct = computeQuotaRemainingPct(userProbe.body?.subscription);

  const baseLog = {
    endpoint: '/v1/user',
    status: userProbe.status,
    latency_ms: userProbe.latency_ms,
    attempt: MAX_ATTEMPTS,
    timeout_ms: PROBE_TIMEOUT_MS,
    error_type: userProbe.error_type,
    response_code: userProbe.status,
    quota_remaining_pct: quotaRemainingPct,
    tts_recent_success_rate: ttsRecentSuccessRate,
  };

  if (userProbe.ok) {
    if (quotaRemainingPct !== undefined && quotaRemainingPct <= 0) {
      const result: ElevenLabsHealthResult = {
        status: 'offline',
        latency_ms: userProbe.latency_ms,
        reason: 'quota_exhausted',
        quota_remaining_pct: quotaRemainingPct,
        tts_recent_success_rate: ttsRecentSuccessRate,
      };
      logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
      return result;
    }

    if (quotaRemainingPct !== undefined && quotaRemainingPct <= QUOTA_WARNING_PCT) {
      const result: ElevenLabsHealthResult = {
        status: 'degraded',
        latency_ms: userProbe.latency_ms,
        reason: 'quota_low',
        quota_remaining_pct: quotaRemainingPct,
        tts_recent_success_rate: ttsRecentSuccessRate,
      };
      logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
      return result;
    }

    if (userProbe.latency_ms > HEALTHY_LATENCY_MS) {
      const result: ElevenLabsHealthResult = {
        status: 'degraded',
        latency_ms: userProbe.latency_ms,
        reason: 'slow_response',
        quota_remaining_pct: quotaRemainingPct,
        tts_recent_success_rate: ttsRecentSuccessRate,
      };
      logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
      return result;
    }

    const result: ElevenLabsHealthResult = {
      status: 'healthy',
      latency_ms: userProbe.latency_ms,
      quota_remaining_pct: quotaRemainingPct,
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({ ...baseLog, classification: result.status, reason: null });
    return result;
  }

  // User probe failed — try TTS fallback for scope-limited keys.
  if (userProbe.permission_denied || userProbe.status === 403) {
    const ttsProbe = await probeTtsEndpoint(apiKey);
    if (ttsProbe.ok) {
      // TTS probe succeeded: interview voice pipeline is operational even when
      // the account endpoint is scope-restricted (common with limited API keys).
      const result: ElevenLabsHealthResult = {
        status: 'healthy',
        latency_ms: userProbe.latency_ms + ttsProbe.latency_ms,
        reason: 'scope_limited',
        tts_recent_success_rate: ttsRecentSuccessRate,
      };
      logHealthCheck({
        ...baseLog,
        classification: result.status,
        reason: result.reason,
        fallback_endpoint: '/v1/text-to-speech',
        fallback_status: ttsProbe.status,
        fallback_latency_ms: ttsProbe.latency_ms,
      });
      return result;
    }

    const result: ElevenLabsHealthResult = {
      status: 'offline',
      latency_ms: userProbe.latency_ms + ttsProbe.latency_ms,
      reason: 'tts_probe_failed',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({
      ...baseLog,
      classification: result.status,
      reason: result.reason,
      fallback_endpoint: '/v1/text-to-speech',
      fallback_status: ttsProbe.status,
      fallback_latency_ms: ttsProbe.latency_ms,
    });
    return result;
  }

  if (userProbe.status === 401) {
    const result: ElevenLabsHealthResult = {
      status: 'offline',
      latency_ms: userProbe.latency_ms,
      reason: 'auth_failed',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
    return result;
  }

  if (userProbe.status === 429) {
    const result: ElevenLabsHealthResult = {
      status: 'degraded',
      latency_ms: userProbe.latency_ms,
      reason: 'rate_limited',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
    return result;
  }

  if (userProbe.error_type === 'timeout') {
    if (ttsRecentSuccessRate !== undefined && ttsRecentSuccessRate >= 0.8) {
      const result: ElevenLabsHealthResult = {
        status: 'degraded',
        latency_ms: userProbe.latency_ms,
        reason: 'timeout',
        tts_recent_success_rate: ttsRecentSuccessRate,
      };
      logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
      return result;
    }

    const result: ElevenLabsHealthResult = {
      status: 'offline',
      latency_ms: userProbe.latency_ms,
      reason: 'timeout',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
    return result;
  }

  if (userProbe.status !== null && userProbe.status >= 500) {
    if (ttsRecentSuccessRate !== undefined && ttsRecentSuccessRate >= 0.8) {
      const result: ElevenLabsHealthResult = {
        status: 'degraded',
        latency_ms: userProbe.latency_ms,
        reason: 'server_error',
        tts_recent_success_rate: ttsRecentSuccessRate,
      };
      logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
      return result;
    }

    const result: ElevenLabsHealthResult = {
      status: 'offline',
      latency_ms: userProbe.latency_ms,
      reason: 'server_error',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
    return result;
  }

  if (
    ttsRecentSuccessRate !== undefined &&
    ttsRecentSuccessRate >= 0.8 &&
    userProbe.status !== null &&
    userProbe.status >= 400
  ) {
    const ttsProbe = await probeTtsEndpoint(apiKey);
    const result: ElevenLabsHealthResult = {
      status: ttsProbe.ok ? 'healthy' : 'degraded',
      latency_ms: userProbe.latency_ms + ttsProbe.latency_ms,
      reason: ttsProbe.ok ? 'scope_limited' : 'tts_probe_failed',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({
      ...baseLog,
      classification: result.status,
      reason: result.reason,
      fallback_endpoint: '/v1/text-to-speech',
      fallback_status: ttsProbe.status,
      fallback_latency_ms: ttsProbe.latency_ms,
    });
    return result;
  }

  if (ttsRecentSuccessRate !== undefined && ttsRecentSuccessRate < 0.5) {
    const result: ElevenLabsHealthResult = {
      status: 'offline',
      latency_ms: userProbe.latency_ms,
      reason: 'tts_probe_failed',
      tts_recent_success_rate: ttsRecentSuccessRate,
    };
    logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
    return result;
  }

  const result: ElevenLabsHealthResult = {
    status: 'offline',
    latency_ms: userProbe.latency_ms,
    reason: userProbe.error_type === 'network_error' ? 'network_error' : 'auth_failed',
    tts_recent_success_rate: ttsRecentSuccessRate,
  };
  logHealthCheck({ ...baseLog, classification: result.status, reason: result.reason });
  return result;
}
