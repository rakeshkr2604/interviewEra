import { describe, it, expect, vi, beforeEach } from 'vitest';
import { releaseSessionLease, validateRefreshLease } from '@/lib/quota/stt-session-lease';
import * as voiceQuota from '@/lib/quota/voice-quota';
import * as redisClient from '@/lib/redis/client';

vi.mock('@/lib/redis/client', () => ({
  default: vi.fn(),
  isRedisConfigured: vi.fn(),
}));

vi.mock('@/lib/quota/voice-quota', () => ({
  checkAndAcquireSession: vi.fn(),
  releaseSession: vi.fn(),
  recordSTTUsage: vi.fn(),
}));

describe('releaseSessionLease', () => {
  const evalMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redisClient.isRedisConfigured).mockReturnValue(true);
    vi.mocked(redisClient.default).mockReturnValue({
      eval: evalMock,
    } as unknown as ReturnType<typeof redisClient.default>);
  });

  it('Case A: owner === userId -> exactly one counter decrement & records usage', async () => {
    evalMock.mockResolvedValue(1);

    await releaseSessionLease('user-123', 'lease-abc', 30);

    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('local owner = redis.call("GET", lease_key)'),
      ['vs:lease:lease-abc', 'vs:active:user-123'],
      ['user-123'],
    );
    expect(voiceQuota.recordSTTUsage).toHaveBeenCalledWith('user-123', 30);
  });

  it('Case B: owner === different user -> returns -1, zero decrement & zero usage recorded', async () => {
    evalMock.mockResolvedValue(-1);

    await releaseSessionLease('user-123', 'lease-abc', 60);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });

  it('Case C: owner === null (expired or fake lease) -> returns -2, zero decrement & zero usage', async () => {
    evalMock.mockResolvedValue(-2);

    await releaseSessionLease('user-123', 'lease-abc', 45);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });

  it('Case D: duplicate release after normal release -> returns 0, zero additional usage', async () => {
    evalMock.mockResolvedValue(0);

    await releaseSessionLease('user-123', 'lease-abc', 30);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });

  it('Case E: duplicate release after expired/missing lease -> returns -2, zero additional usage', async () => {
    evalMock.mockResolvedValue(-2);

    await releaseSessionLease('user-123', 'lease-abc', 30);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });

  it('Case F: concurrent duplicate releases -> 1st gets 1, 2nd gets 0, usage recorded exactly once', async () => {
    evalMock.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    await Promise.all([
      releaseSessionLease('user-123', 'lease-abc', 30),
      releaseSessionLease('user-123', 'lease-abc', 30),
    ]);

    expect(evalMock).toHaveBeenCalledTimes(2);
    expect(voiceQuota.recordSTTUsage).toHaveBeenCalledTimes(1);
    expect(voiceQuota.recordSTTUsage).toHaveBeenCalledWith('user-123', 30);
  });

  it('Case G: fake/nonexistent lease ID -> returns -2, zero usage', async () => {
    evalMock.mockResolvedValue(-2);

    await releaseSessionLease('user-123', 'fake-uuid-999', 120);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });

  it('Case H: duplicate release when new session is active -> returns 0, new session counter untouched', async () => {
    evalMock.mockResolvedValue(0);

    await releaseSessionLease('user-123', 'old-lease-1', 45);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });

  it('Case I: handles unconfigured Redis fallback safely', async () => {
    vi.mocked(redisClient.isRedisConfigured).mockReturnValue(false);

    await releaseSessionLease('user-123', 'lease-abc', 20);

    expect(evalMock).not.toHaveBeenCalled();
    expect(voiceQuota.releaseSession).toHaveBeenCalledWith('user-123');
    expect(voiceQuota.recordSTTUsage).toHaveBeenCalledWith('user-123', 20);
  });

  it('Case J1: multi-session counter (active = 2) -> releasing valid lease L1 passes active key vs:active:user and records usage once', async () => {
    evalMock.mockResolvedValue(1);

    await releaseSessionLease('user-123', 'lease-L1', 40);

    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('local owner = redis.call("GET", lease_key)'),
      ['vs:lease:lease-L1', 'vs:active:user-123'],
      ['user-123'],
    );
    expect(voiceQuota.recordSTTUsage).toHaveBeenCalledTimes(1);
    expect(voiceQuota.recordSTTUsage).toHaveBeenCalledWith('user-123', 40);
  });

  it('Case J2: handles Redis eval exceptions without throwing or recording false usage', async () => {
    evalMock.mockRejectedValue(new Error('Redis connection error'));

    await releaseSessionLease('user-123', 'lease-abc', 30);

    expect(evalMock).toHaveBeenCalled();
    expect(voiceQuota.recordSTTUsage).not.toHaveBeenCalled();
  });
});

describe('validateRefreshLease', () => {
  const evalMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(redisClient.isRedisConfigured).mockReturnValue(true);
    vi.mocked(redisClient.default).mockReturnValue({
      eval: evalMock,
    } as unknown as ReturnType<typeof redisClient.default>);
  });

  it('Refreshes both lease and active counter TTLs when valid lease and active counter exist', async () => {
    evalMock.mockResolvedValue(1);

    const valid = await validateRefreshLease('user-123', 'lease-abc');

    expect(valid).toBe(true);
    expect(evalMock).toHaveBeenCalledWith(
      expect.stringContaining('redis.call("EXPIRE", active_key, ttl_seconds)'),
      ['vs:lease:lease-abc', 'vs:active:user-123'],
      ['user-123', '1800'],
    );
  });

  it('Refreshes lease TTL and emits warning without fabricating count when active counter is missing', async () => {
    evalMock.mockResolvedValue(2);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const valid = await validateRefreshLease('user-123', 'lease-abc');

    expect(valid).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[voice-quota] active counter missing during lease refresh',
      { userId: 'user-123', leaseId: 'lease-abc' },
    );
    consoleSpy.mockRestore();
  });

  it('Returns false when lease owner is wrong or lease does not exist', async () => {
    evalMock.mockResolvedValue(0);

    const valid = await validateRefreshLease('user-123', 'invalid-lease');

    expect(valid).toBe(false);
  });

  it('Returns false when Redis eval throws exception', async () => {
    evalMock.mockRejectedValue(new Error('Redis error'));

    const valid = await validateRefreshLease('user-123', 'lease-abc');

    expect(valid).toBe(false);
  });

  it('Returns true fallback when Redis is not configured', async () => {
    vi.mocked(redisClient.isRedisConfigured).mockReturnValue(false);

    const valid = await validateRefreshLease('user-123', 'lease-abc');

    expect(valid).toBe(true);
    expect(evalMock).not.toHaveBeenCalled();
  });
});
