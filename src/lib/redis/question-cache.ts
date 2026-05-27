import getRedis from './client';
import type { ParsedResume } from '@/types/app.types';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';

const TTL_SECONDS = 3600; // 1 hour per spec

export interface CachedGeneratedQuestion {
  order: number;
  question_text: string;
  category: string;
  rubric: unknown;
}

// Stable hash of the resume's key signals (not the full text — avoids
// cache misses from whitespace/formatting differences in the same resume).
function hashResume(parsed: ParsedResume | unknown): string {
  const p = coerceParsedResume(parsed);
  const sig = [
    p.target_role,
    p.experience_estimate,
    p.skills.slice(0, 8).sort().join(','),
  ].join('|');

  // djb2 hash — simple, fast, no crypto dependency
  let h = 5381;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) + h) ^ sig.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export interface QuestionCacheSessionContext {
  goal: string;
  interviewMode: string;
  experienceYears: number;
  interviewerId: string;
  /** djb2 fingerprint of trimmed JD prefix; "0" when absent */
  jdFingerprint: string;
  /** Retention tier (1–4); partitions cache so tier-aware questions don't leak across tiers. */
  tier: number;
}

/** Stable hash for Redis cache partitioning when JD text differs */
export function computeJdFingerprint(jobDescription: string | undefined): string {
  const s = (jobDescription ?? '').trim().slice(0, 2000);
  if (!s) return '0';
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function hashSessionContext(session: QuestionCacheSessionContext): string {
  const sig = `${session.goal}|${session.interviewMode}|${session.experienceYears}|${session.interviewerId}|${session.jdFingerprint}|t${session.tier}`;
  let h = 5381;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) + h) ^ sig.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

export function buildCacheKey(
  role: string,
  difficulty: string,
  parsedResume: ParsedResume,
  session: QuestionCacheSessionContext
): string {
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 40);
  const resumeHash = hashResume(parsedResume);
  const ctxHash = hashSessionContext(session);
  return `qcache:${slug}:${difficulty}:${resumeHash}:${ctxHash}`;
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