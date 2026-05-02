import getRedis from './client';
import type { ParsedResume } from '@/types/app.types';

const TTL_SECONDS = 3600; // 1 hour per spec

export interface CachedGeneratedQuestion {
  order: number;
  question_text: string;
  category: string;
  rubric: unknown;
}

// Stable hash of the resume's key signals (not the full text — avoids
// cache misses from whitespace/formatting differences in the same resume).
function hashResume(parsed: ParsedResume): string {
  const sig = [
    parsed.skills.slice(0, 8).sort().join(','),
    parsed.education[0]?.institution ?? '',
    parsed.education[0]?.degree ?? '',
    parsed.projects
      .slice(0, 3)
      .map((p) => p.name)
      .join(','),
    parsed.target_roles.slice(0, 3).join(','),
  ].join('|');

  // djb2 hash — simple, fast, no crypto dependency
  let h = 5381;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) + h) ^ sig.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function buildCacheKey(
  role: string,
  difficulty: string,
  parsedResume: ParsedResume
): string {
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const resumeHash = hashResume(parsedResume);
  return `qcache:${slug}:${difficulty}:${resumeHash}`;
}

export async function getCachedQuestions(
  key: string
): Promise<CachedGeneratedQuestion[] | null> {
  try {
    const redis = getRedis();
    const cached = await redis.get<CachedGeneratedQuestion[]>(key);
    return cached ?? null;
  } catch (err) {
    console.error('[question-cache] Redis get error, skipping cache:', err);
    return null;
  }
}

export async function setCachedQuestions(
  key: string,
  questions: CachedGeneratedQuestion[]
): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, questions, { ex: TTL_SECONDS });
  } catch (err) {
    console.error('[question-cache] Redis set error, skipping cache write:', err);
  }
}