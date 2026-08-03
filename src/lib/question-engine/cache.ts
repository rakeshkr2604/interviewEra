/**
 * Question Engine v2 — Upstash Redis cache (follows src/lib/redis/question-cache.ts:
 * djb2 signature hash, fail-soft get/set that never throws to callers).
 *
 * Sets:    keyed per mode — role: (role, level, domain); topic: (topic, level);
 *          company: (company, role, level, domain). JD mode is NEVER cached —
 *          the caller must not call these helpers for JD requests.
 * Answers: keyed on (question, level, topic).
 *
 * Cache-freshness (durable pattern, same as src/lib/redis/ats-result-cache.ts +
 * src/app/(marketing)/tools/ats-checker/actions.ts):
 *   1. cacheReadsEnabled() skips reads entirely outside production — local/dev
 *      testing always sees current prompt output, no version bump to remember.
 *   2. DEPLOY_ID folds the live deploy's commit SHA into every key, so each
 *      production deploy gets a fresh cache namespace automatically.
 *   3. QG_PROMPT_VERSION remains a third, optional manual layer for
 *      force-invalidating without a redeploy (e.g. a prompt-only hotfix).
 *   4. safeParse on read (below) stays as a secondary safety net — it catches
 *      incompatible shape changes but NOT additive ones (a new optional field
 *      still parses), which is exactly why (1) and (2) exist.
 */

import getRedis from '@/lib/redis/client';
import { QG_PROMPT_VERSION } from './prompts';
import { qgAnswerSchema, qgQuestionSchema, type QgAnswer, type QgQuestion } from './schemas';
import { z } from 'zod';

const SET_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days per spec
const ANSWER_TTL_SECONDS = 30 * 24 * 60 * 60;

// Vercel injects this on every build (VERCEL_GIT_COMMIT_SHA) — same pattern
// already used in src/app/(marketing)/tools/ats-checker/actions.ts and
// src/lib/pdf/parser.ts. No commit SHA at local build time; that's fine
// because local reads are skipped entirely by cacheReadsEnabled() below.
const DEPLOY_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local-dev';

function cacheReadsEnabled(): boolean {
  return process.env.NODE_ENV === 'production';
}

const cachedSetSchema = z.array(qgQuestionSchema).min(1);

function djb2(sig: string): string {
  let h = 5381;
  for (let i = 0; i < sig.length; i++) {
    h = ((h << 5) + h) ^ sig.charCodeAt(i);
  }
  return (h >>> 0).toString(16);
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type QgSetCacheKeyInput =
  | { mode: 'role'; role: string; level: string; domain: string }
  | { mode: 'topic'; topic: string; level: string }
  | { mode: 'company'; company: string; role: string; level: string; domain: string };

export function buildQgSetCacheKey(input: QgSetCacheKeyInput): string {
  const parts: string[] = [input.mode];
  if (input.mode === 'role') {
    parts.push(normalize(input.role), normalize(input.level), normalize(input.domain));
  } else if (input.mode === 'topic') {
    parts.push(normalize(input.topic), normalize(input.level));
  } else {
    parts.push(normalize(input.company), normalize(input.role), normalize(input.level), normalize(input.domain));
  }
  const sig = parts.join('|');
  return `qg:${QG_PROMPT_VERSION}:${DEPLOY_ID}:set:${djb2(sig)}`;
}

export function buildQgAnswerCacheKey(
  question: string,
  level: string,
  topic = '',
): string {
  // Topic is included so agentic-AI coaching cannot be shadowed by a generic
  // cached guide for an identical question at the same experience level.
  const sig = `${normalize(question)}|${normalize(level)}|${normalize(topic)}`;
  return `qg:${QG_PROMPT_VERSION}:${DEPLOY_ID}:ans:${djb2(sig)}`;
}

export async function getCachedQgSet(key: string): Promise<QgQuestion[] | null> {
  if (!cacheReadsEnabled()) return null;
  try {
    const redis = getRedis();
    const cached = await redis.get<unknown>(key);
    if (!cached) return null;
    const parsed = cachedSetSchema.safeParse(cached);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error('[qg-cache] Redis get error, skipping cache:', err);
    return null;
  }
}

export async function setCachedQgSet(key: string, questions: QgQuestion[]): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, questions, { ex: SET_TTL_SECONDS });
  } catch (err) {
    console.error('[qg-cache] Redis set error, skipping cache write:', err);
  }
}

export async function getCachedQgAnswer(key: string): Promise<QgAnswer | null> {
  if (!cacheReadsEnabled()) return null;
  try {
    const redis = getRedis();
    const cached = await redis.get<unknown>(key);
    if (!cached) return null;
    const parsed = qgAnswerSchema.safeParse(cached);
    return parsed.success ? parsed.data : null;
  } catch (err) {
    console.error('[qg-cache] Redis get error, skipping cache:', err);
    return null;
  }
}

export async function setCachedQgAnswer(key: string, answer: QgAnswer): Promise<void> {
  try {
    const redis = getRedis();
    await redis.set(key, answer, { ex: ANSWER_TTL_SECONDS });
  } catch (err) {
    console.error('[qg-cache] Redis set error, skipping cache write:', err);
  }
}
