/**
 * Lightweight A/B experiment framework — DB-backed assignments, env overrides.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { FLAGS, FLAG_DEFAULTS, type FlagName } from '@/lib/analytics/flags';
import { persistProductEventAsync } from '@/lib/analytics/product-events-store';
import { FREE_PLAN } from '@/lib/pricing/plans';

export const EXPERIMENTS = {
  FIRST_INTERVIEW_QUESTIONS: FLAGS.FIRST_INTERVIEW_QUESTIONS,
  FREE_CREDIT_COUNT: FLAGS.FREE_CREDIT_COUNT,
} as const;

export type ExperimentKey = (typeof EXPERIMENTS)[keyof typeof EXPERIMENTS];

/** Variant definitions per experiment. */
export const EXPERIMENT_VARIANTS: Record<ExperimentKey, readonly string[]> = {
  [EXPERIMENTS.FIRST_INTERVIEW_QUESTIONS]: ['4', '6'],
  [EXPERIMENTS.FREE_CREDIT_COUNT]: [String(FREE_PLAN.credits)],
};

function hashToBucket(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickVariant(userId: string, key: ExperimentKey): string {
  const variants = EXPERIMENT_VARIANTS[key];
  const idx = hashToBucket(`${userId}:${key}`) % variants.length;
  return variants[idx] ?? FLAG_DEFAULTS[key as FlagName];
}

/**
 * Resolve experiment variant for a user. Persists assignment on first read.
 * Env override (NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS) wins for that flag only.
 */
export async function getExperimentVariant(
  userId: string,
  key: ExperimentKey,
): Promise<string> {
  if (
    key === EXPERIMENTS.FIRST_INTERVIEW_QUESTIONS &&
    typeof process.env.NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS === 'string'
  ) {
    const raw = process.env.NEXT_PUBLIC_FIRST_INTERVIEW_QUESTIONS.trim();
    if (/^\d+$/.test(raw)) return raw;
  }

  const svc = createServiceClient();
  const { data: existing } = await svc
    .from('experiment_assignments')
    .select('variant')
    .eq('user_id', userId)
    .eq('experiment_key', key)
    .maybeSingle();

  if (existing?.variant) return existing.variant;

  const variant = pickVariant(userId, key);
  await svc.from('experiment_assignments').upsert(
    { user_id: userId, experiment_key: key, variant },
    { onConflict: 'user_id,experiment_key' },
  );

  persistProductEventAsync('experiment_exposed', {
    user_id: userId,
    experiment_key: key,
    variant,
  });

  return variant;
}

/** First-interview question count from experiment assignment (clamped 4–10). */
export async function getExperimentFirstInterviewQuestionCount(userId: string): Promise<number> {
  const raw = await getExperimentVariant(userId, EXPERIMENTS.FIRST_INTERVIEW_QUESTIONS);
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(Math.max(parsed, 4), 10);
}
