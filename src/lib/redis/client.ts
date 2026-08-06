import { Redis } from '@upstash/redis';

// Lazily instantiated so the module can be imported without crashing
// when env vars are absent (e.g., during static analysis / tsc).
let _redis: Redis | null = null;

export function isPlaceholderValue(val?: string): boolean {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return (
    lower.includes('placeholder') ||
    lower.includes('supabase-demo') ||
    lower === 'sk-placeholder' ||
    lower === 're_placeholder' ||
    lower === 'rzp_test_placeholder'
  );
}

export function isRedisConfigured(): boolean {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) return false;
  if (isPlaceholderValue(url) || isPlaceholderValue(token)) return false;

  return true;
}

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token || !isRedisConfigured()) {
    throw new Error(
      'Missing or placeholder Upstash Redis env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN'
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

export default getRedis;