import { Redis } from '@upstash/redis';

// Lazily instantiated so the module can be imported without crashing
// when env vars are absent (e.g., during static analysis / tsc).
let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Missing Upstash Redis env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN'
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

export default getRedis;