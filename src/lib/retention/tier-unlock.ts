/**
 * Tier unlock orchestration — public entry point for the retention system.
 *
 * Spec reference: hybrid-retention-system-spec.md §"Part 1: Progress Gates".
 *
 * The function is intentionally a pipeline of small steps with one clear
 * responsibility per step. Order:
 *   1. Validate input (Zod, no trust in callers)
 *   2. Load current progression state from DB
 *   3. Compute scoring summary (from supplied session OR session_quality_log)
 *   4. Determine candidate next tier
 *   5. Evaluate unlock criteria
 *   6. Apply cooldown gate (unless bypassed)
 *   7. Run anti-abuse heuristics
 *   8. Attempt atomic DB unlock via `unlock_user_tier` RPC
 *   9. Log + return typed result
 *
 * Atomicity: the RPC uses optimistic concurrency (UPDATE … WHERE current_tier
 * = expected_from_tier). Two concurrent callers cannot both win.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';
import { logger } from './logger';
import { checkAndUnlockTierInputSchema } from './validation';
import {
  evaluateUnlockCriteria,
  isWithinCooldown,
  nextTier,
  detectSuspiciousProgression,
} from './guards';
import { maxDimensionScore, summarize } from './scoring';
import {
  MAX_TIER,
  QUALITY_CRITERIA,
  TIER_2_UNLOCK,
  TIER_3_UNLOCK,
  TIER_4_UNLOCK,
  effectiveMinQuestionsAnswered,
  type TierNumber,
} from './constants';
import type {
  CheckAndUnlockTierInput,
  ScoringSummary,
  SessionData,
  SessionQualityRow,
  UnlockResult,
  UnlockSkipped,
  UserProgressRow,
} from './types';

// ─── small helpers (kept local — not reused outside this file) ──────────────

function skip(
  currentTier: TierNumber,
  reasonCode: UnlockSkipped['reasonCode'],
  message: string,
  diagnostics?: UnlockSkipped['diagnostics'],
): UnlockSkipped {
  return {
    ok: true,
    unlocked: false,
    currentTier,
    reasonCode,
    message,
    diagnostics,
  };
}

function reasonForUnlock(toTier: TierNumber): string {
  if (toTier === TIER_2_UNLOCK.toTier) return TIER_2_UNLOCK.reason;
  if (toTier === TIER_3_UNLOCK.toTier) return TIER_3_UNLOCK.reason;
  if (toTier === TIER_4_UNLOCK.toTier) return TIER_4_UNLOCK.reason;
  // Shouldn't be reachable — `nextTier()` only returns valid targets.
  return 'admin_grant';
}

async function loadProgress(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserProgressRow | null> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('progress_load_failed', { userId, error: error.message });
    throw new Error(`user_progress load failed: ${error.message}`);
  }
  return (data as UserProgressRow | null) ?? null;
}

/**
 * Load recent quality session rows in DESC order. We bound at 50 — that's well
 * past the 5-session rolling window and well past any reasonable evaluation
 * lookback. Keeps payload predictable.
 */
async function loadRecentSessions(
  supabase: SupabaseClient,
  userId: string,
  limit = 50,
): Promise<SessionQualityRow[]> {
  const { data, error } = await supabase
    .from('session_quality_log')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('sessions_load_failed', { userId, error: error.message });
    throw new Error(`session_quality_log load failed: ${error.message}`);
  }
  return (data as SessionQualityRow[] | null) ?? [];
}

/**
 * Synthesize an in-memory session row from a caller-supplied fresh session so
 * scoring helpers can treat it identically to DB rows. We DO NOT insert here
 * — that's the caller's responsibility (interview-complete handler) so the
 * write path remains owned by one component.
 */
function synthesizeSession(
  userId: string,
  fresh: NonNullable<CheckAndUnlockTierInput['sessionQuality']>,
): SessionQualityRow {
  const maxDim =
    fresh.maxDimensionScore ?? maxDimensionScore(fresh.dimensionScores) ?? null;
  return {
    id: '00000000-0000-0000-0000-000000000000', // synthetic — not persisted
    user_id: userId,
    interview_id: fresh.interviewId,
    questions_answered: 0,
    total_questions: 1,
    questions_skipped: 0,
    avg_answer_duration_sec: 0,
    session_score: fresh.sessionScore,
    quality_met: fresh.qualityMet,
    dimension_scores: fresh.dimensionScores,
    max_dimension_score: maxDim,
    unlock_contribution: {},
    total_typing_ms: null,
    total_speaking_ms: null,
    tab_blur_count: null,
    device_fingerprint: null,
    ip_hash: null,
    flagged_low_engagement: false,
    flagged_duplicate_fingerprint: false,
    flagged_impossible_speed: false,
    flag_notes: null,
    completed_at: new Date().toISOString(),
  };
}

/**
 * Merge a synthesized fresh session with DB sessions, dedup-ing by
 * interview_id. We prefer the DB row when both exist (it has the authoritative
 * persisted scoring breakdown).
 */
function combinedSessionRows(
  dbRows: SessionQualityRow[],
  fresh: SessionQualityRow | null,
): SessionQualityRow[] {
  if (!fresh) return dbRows;
  if (dbRows.some((r) => r.interview_id === fresh.interview_id)) return dbRows;
  return [fresh, ...dbRows];
}

// Patches last_check_at on every invocation so retention dashboards can see
// "users who attempted progression today" even when no unlock fired. Counter
// increments live inside the SECURITY DEFINER RPC where they can be atomic.
async function touchLastCheck(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('user_progress')
    .update({ last_check_at: new Date().toISOString() })
    .eq('user_id', userId);
  if (error) {
    logger.warn('last_check_touch_failed', { userId, error: error.message });
  }
}

async function markFlagged(
  supabase: SupabaseClient,
  userId: string,
  reasons: string[],
): Promise<void> {
  const { error } = await supabase
    .from('user_progress')
    .update({
      flagged_suspicious: true,
      flagged_reason: reasons.slice(0, 5).join('|'),
    })
    .eq('user_id', userId);
  if (error) {
    // Logging only — do not propagate. Flagging is best-effort observability.
    logger.error('flag_write_failed', { userId, error: error.message });
  }
}

interface UnlockRpcRow {
  success: boolean;
  new_tier: number | null;
  unlocked_at: string | null;
}

async function callUnlockRpc(
  supabase: SupabaseClient,
  userId: string,
  fromTier: TierNumber,
  toTier: TierNumber,
  reason: string,
): Promise<UnlockRpcRow> {
  const { data, error } = await supabase.rpc('unlock_user_tier', {
    p_user_id: userId,
    p_expected_from_tier: fromTier,
    p_to_tier: toTier,
    p_reason: reason,
  });

  if (error) {
    logger.error('unlock_rpc_error', {
      userId,
      fromTier,
      toTier,
      error: error.message,
    });
    throw new Error(`unlock_user_tier RPC failed: ${error.message}`);
  }

  // Supabase returns TABLE-returning functions as an array of rows.
  const rows = (data as UnlockRpcRow[] | null) ?? [];
  return rows[0] ?? { success: false, new_tier: null, unlocked_at: null };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Evaluate progression criteria and, if the user qualifies, atomically unlock
 * the next tier. Idempotent: repeat calls after a successful unlock return a
 * `skipped` result with `criteria_not_met` (or `already_at_max_tier`).
 *
 * Never throws for "user input was wrong" or "user doesn't qualify" — those
 * are returned as typed results. Only throws for unrecoverable DB / RPC
 * failures (Supabase down, schema drift). Callers should treat throws as 5xx.
 */
export async function checkAndUnlockTier(
  input: CheckAndUnlockTierInput,
): Promise<UnlockResult> {
  // 1. Validate input — Zod gives us a structured error path.
  const parsed = checkAndUnlockTierInputSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn('input_validation_failed', {
      issues: parsed.error.issues,
    });
    return {
      ok: false,
      unlocked: false,
      reasonCode: 'invalid_input',
      message: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }

  const { userId, sessionQuality, bypassCooldown } = parsed.data;
  const supabase = createServiceClient();
  const now = new Date();

  // 2. Load progression. Bootstrap trigger guarantees a row in steady state;
  //    fall back gracefully if the row was deleted out from under us.
  let progress: UserProgressRow | null;
  try {
    progress = await loadProgress(supabase, userId);
  } catch (err) {
    return {
      ok: false,
      unlocked: false,
      reasonCode: 'database_error',
      message: err instanceof Error ? err.message : 'unknown DB error',
    };
  }

  if (!progress) {
    logger.error('no_user_progress_row', { userId });
    return {
      ok: false,
      unlocked: false,
      reasonCode: 'no_user_progress_row',
      message: 'user_progress row not found for user',
    };
  }

  const currentTier = progress.current_tier as TierNumber;

  // Patch last_check_at unconditionally (fire-and-forget — failures don't break the flow).
  void touchLastCheck(supabase, userId);

  // 3. Early exit: already at max tier.
  if (currentTier >= MAX_TIER) {
    return skip(currentTier, 'already_at_max_tier', 'User already at max tier.');
  }

  const target = nextTier(currentTier);
  if (target === null) {
    return skip(currentTier, 'already_at_max_tier', 'User already at max tier.');
  }

  // 4. Build scoring summary.
  let recent: SessionQualityRow[];
  try {
    recent = await loadRecentSessions(supabase, userId);
  } catch (err) {
    return {
      ok: false,
      unlocked: false,
      reasonCode: 'database_error',
      message: err instanceof Error ? err.message : 'unknown DB error',
    };
  }

  const synthetic = sessionQuality ? synthesizeSession(userId, sessionQuality) : null;
  const allSessions = combinedSessionRows(recent, synthetic);
  const summary: ScoringSummary = summarize(allSessions);

  // 5. Evaluate criteria.
  const criteria = evaluateUnlockCriteria(currentTier, summary);
  if (!criteria.qualifies) {
    return skip(currentTier, 'criteria_not_met', criteria.reason, {
      totalSessions: summary.totalSessions,
      overallAvg: summary.overallAvg,
      last5Avg: summary.last5Avg,
      maxDimensionScore: summary.maxDimensionScoreLifetime,
    });
  }

  // 6. Cooldown.
  if (!bypassCooldown && isWithinCooldown(progress, now)) {
    logger.warn('unlock_rejected_cooldown', {
      userId,
      lastUnlockAt: progress.last_unlock_at,
    });
    return skip(
      currentTier,
      'cooldown_active',
      'Unlock cooldown in effect; try again shortly.',
    );
  }

  // 7. Anti-abuse heuristics.
  const suspicion = detectSuspiciousProgression(progress, target, now);
  if (suspicion.suspicious) {
    logger.warn('suspicious_progression_detected', {
      userId,
      currentTier,
      target,
      reasons: suspicion.reasons,
    });
    // Persist the flag (best-effort) but do NOT auto-block; the criteria gate
    // already required the user to have legit scores. We only hard-block if
    // multiple high-severity signals coincide.
    void markFlagged(supabase, userId, suspicion.reasons);

    const blocking = suspicion.reasons.some(
      (r) => r.startsWith('tier_skip_') || r.startsWith('tier_4_with_only_'),
    );
    if (blocking) {
      return skip(
        currentTier,
        'suspicious_progression',
        `Progression flagged: ${suspicion.reasons.join('; ')}`,
      );
    }
  }

  // 8. Atomic unlock.
  let rpc: UnlockRpcRow;
  try {
    rpc = await callUnlockRpc(supabase, userId, currentTier, target, reasonForUnlock(target));
  } catch (err) {
    return {
      ok: false,
      unlocked: false,
      reasonCode: 'database_error',
      message: err instanceof Error ? err.message : 'unknown DB error',
    };
  }

  if (!rpc.success || rpc.new_tier === null) {
    // Another writer beat us, or the WHERE clause didn't match. Treat as a
    // benign no-op — caller can re-read state to see what happened.
    logger.warn('unlock_race_lost', { userId, currentTier, target });
    return skip(
      currentTier,
      'race_lost',
      'Tier unlock raced with another writer; no change applied.',
    );
  }

  // 9. Success.
  logger.info('tier_unlock_success', {
    userId,
    previousTier: currentTier,
    newTier: rpc.new_tier,
    unlockedAt: rpc.unlocked_at,
    unlockReason: reasonForUnlock(target),
    diagnostics: {
      totalSessions: summary.totalSessions,
      overallAvg: summary.overallAvg,
      last5Avg: summary.last5Avg,
      maxDimensionScore: summary.maxDimensionScoreLifetime,
    },
  });

  return {
    ok: true,
    unlocked: true,
    previousTier: currentTier,
    newTier: rpc.new_tier as TierNumber,
    unlockedAt: rpc.unlocked_at ?? now.toISOString(),
    reasonCode: reasonForUnlock(target),
  };
}

/**
 * Derives `sessionQuality` from {@link SessionData}, then calls the canonical
 * pipeline {@link checkAndUnlockTier}.
 *
 * RBAC: callers must ensure `userId` matches `session.userId` (or intended
 * service-role semantics) before invoking.
 */
export async function checkAndUnlockTierForInterviewSession(
  userId: string,
  session: SessionData,
  options?: { bypassCooldown?: boolean },
): Promise<UnlockResult> {
  const maxDim = maxDimensionScore(session.dimensionScores);

  const minAnsweredRequired = effectiveMinQuestionsAnswered(session.totalQuestions);
  const qualityMet =
    session.questionsAnswered >= minAnsweredRequired &&
    session.questionsAnswered === session.totalQuestions &&
    session.avgAnswerDuration >= QUALITY_CRITERIA.minAvgDurationSec &&
    session.overallScore >= QUALITY_CRITERIA.minSessionScore;

  const sq: NonNullable<CheckAndUnlockTierInput['sessionQuality']> = {
    interviewId: session.interviewId,
    sessionScore: session.overallScore,
    maxDimensionScore: maxDim ?? session.overallScore,
    dimensionScores: session.dimensionScores,
    qualityMet,
  };

  return checkAndUnlockTier({
    userId,
    sessionQuality: sq,
    bypassCooldown: options?.bypassCooldown,
  });
}