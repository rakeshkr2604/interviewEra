/**
 * Question Engine v2 — Upstash Redis cache (follows src/lib/redis/question-cache.ts:
 * djb2 signature hash, fail-soft get/set that never throws to callers).
 *
 * Sets:    keyed on (mode, role, level, domain). JD mode is NEVER cached — the
 *          caller must not call these helpers for JD requests.
 * Answers: keyed on (question, level).
 *
 * QG_PROMPT_VERSION is part of every key so a prompt bump invalidates
 * previously cached output.
 */

import getRedis from '@/lib/redis/client';
import { QG_PROMPT_VERSION } from './prompts';
import { qgAnswerSchema, qgQuestionSchema, type QgAnswer, type QgQuestion } from './schemas';
import { z } from 'zod';

const SET_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days per spec
const ANSWER_TTL_SECONDS = 30 * 24 * 60 * 60;

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

export function buildQgSetCacheKey(input: {
  mode: 'role';
  role: string;
  level: string;
  domain: string;
}): string {
  const sig = [input.mode, normalize(input.role), normalize(input.level), normalize(input.domain)].join('|');
  return `qg:${QG_PROMPT_VERSION}:set:${djb2(sig)}`;
}

export function buildQgAnswerCacheKey(question: string, level: string): string {
  const sig = `${normalize(question)}|${normalize(level)}`;
  return `qg:${QG_PROMPT_VERSION}:ans:${djb2(sig)}`;
}

export async function getCachedQgSet(key: string): Promise<QgQuestion[] | null> {
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
