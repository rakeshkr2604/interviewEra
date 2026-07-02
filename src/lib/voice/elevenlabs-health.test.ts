import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

import { checkElevenLabsHealth } from '@/lib/voice/elevenlabs-health';
import { formatElevenLabsHealthReason } from '@/lib/voice/elevenlabs-health-labels';
import { resolveElevenLabsApiKey } from '@/lib/voice/elevenlabs-health-shared';

function mockUserResponse(
  status: number,
  body: Record<string, unknown> | string = {},
): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status });
}

function mockAudioResponse(status = 200): Response {
  return new Response(new ArrayBuffer(8), {
    status,
    headers: { 'Content-Type': 'audio/mpeg' },
  });
}

function mockTelemetryRows(rows: Array<{ success: boolean }>) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

describe('resolveElevenLabsApiKey', () => {
  const original = process.env.ELEVENLABS_API_KEY;

  afterEach(() => {
    process.env.ELEVENLABS_API_KEY = original;
  });

  it('returns null for missing key', () => {
    delete process.env.ELEVENLABS_API_KEY;
    expect(resolveElevenLabsApiKey()).toBeNull();
  });

  it('returns null for placeholder key', () => {
    process.env.ELEVENLABS_API_KEY = 'your_elevenlabs_api_key';
    expect(resolveElevenLabsApiKey()).toBeNull();
  });

  it('returns trimmed key when valid', () => {
    process.env.ELEVENLABS_API_KEY = '  sk_test_123456789012345678901234567890  ';
    expect(resolveElevenLabsApiKey()).toBe('sk_test_123456789012345678901234567890');
  });
});

describe('checkElevenLabsHealth', () => {
  const original = process.env.ELEVENLABS_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = 'sk_test_123456789012345678901234567890';
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    mockTelemetryRows([]);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.ELEVENLABS_API_KEY = original;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    mockFrom.mockReset();
  });

  it('returns offline when key is missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('offline');
    expect(result.reason).toBe('missing_key');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns healthy for successful user probe with quota headroom', async () => {
    fetchMock.mockResolvedValueOnce(
      mockUserResponse(200, {
        subscription: { character_count: 1000, character_limit: 10000 },
      }),
    );

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('healthy');
    expect(result.quota_remaining_pct).toBe(90);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns offline when quota is exhausted', async () => {
    fetchMock.mockResolvedValueOnce(
      mockUserResponse(200, {
        subscription: { character_count: 10000, character_limit: 10000 },
      }),
    );

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('offline');
    expect(result.reason).toBe('quota_exhausted');
  });

  it('returns offline for hard auth failure without permission hint', async () => {
    fetchMock.mockResolvedValueOnce(
      mockUserResponse(401, { detail: { message: 'Invalid API key' } }),
    );

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('offline');
    expect(result.reason).toBe('auth_failed');
  });

  it('returns healthy when user endpoint is scope-limited but TTS probe succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockUserResponse(401, {
          detail: {
            message: 'The API key you used is missing the permission user_read',
          },
        }),
      )
      .mockResolvedValueOnce(mockAudioResponse(200));

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('healthy');
    expect(result.reason).toBe('scope_limited');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns offline when scope-limited and TTS probe fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockUserResponse(403, { detail: { message: 'Forbidden' } }),
      )
      .mockResolvedValueOnce(mockAudioResponse(401));

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('offline');
    expect(result.reason).toBe('tts_probe_failed');
  });

  it('returns degraded on rate limit', async () => {
    fetchMock.mockResolvedValue(mockUserResponse(429, { detail: 'Too many requests' }));

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('degraded');
    expect(result.reason).toBe('rate_limited');
  });

  it('returns offline on repeated timeout without corroborating telemetry', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('offline');
    expect(result.reason).toBe('timeout');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('returns degraded on timeout when recent TTS telemetry is strong', async () => {
    mockTelemetryRows([{ success: true }, { success: true }, { success: true }, { success: true }, { success: true }]);
    fetchMock.mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }));

    const result = await checkElevenLabsHealth();
    expect(result.status).toBe('degraded');
    expect(result.reason).toBe('timeout');
    expect(result.tts_recent_success_rate).toBe(1);
  });

  it('returns degraded for slow user probe latency', async () => {
    fetchMock.mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 3_100));
      return mockUserResponse(200, {
        subscription: { character_count: 1000, character_limit: 10000 },
      });
    });

    vi.useFakeTimers();
    const pending = checkElevenLabsHealth();
    await vi.advanceTimersByTimeAsync(3_200);
    const result = await pending;
    vi.useRealTimers();

    expect(result.status).toBe('degraded');
    expect(result.reason).toBe('slow_response');
  });
});

describe('formatElevenLabsHealthReason', () => {
  it('maps scope_limited to a readable label', () => {
    expect(formatElevenLabsHealthReason('scope_limited')).toBe(
      'TTS OK · account endpoint restricted',
    );
  });

  it('returns undefined for missing reason', () => {
    expect(formatElevenLabsHealthReason(undefined)).toBeUndefined();
  });
});
