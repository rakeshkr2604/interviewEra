import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildRateLimitHttpResponse, checkRateLimit } from './rate-limit';

vi.mock('./client', () => ({
  default: () => {
    throw new Error('redis down');
  },
}));

describe('rate-limit fail-closed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fails open by default when Redis is unavailable', async () => {
    const result = await checkRateLimit('test:open', 60, 5);
    expect(result.allowed).toBe(true);
    expect(result.redisUnavailable).toBeUndefined();
  });

  it('fails closed for expensive endpoints when Redis is unavailable', async () => {
    const result = await checkRateLimit('test:closed', 60, 5, { failClosed: true });
    expect(result.allowed).toBe(false);
    expect(result.redisUnavailable).toBe(true);
  });

  it('returns 503 response shape when Redis is unavailable', async () => {
    const result = await checkRateLimit('test:closed', 60, 5, { failClosed: true });
    const http = buildRateLimitHttpResponse(result, 'Too many requests');
    expect(http?.status).toBe(503);
    expect(http?.body.code).toBe('rate_limit_backend_unavailable');
  });
});
