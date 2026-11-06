/**
 * Interview-complete retention pipeline — session_quality_log insert, unlock check,
 * rollups into user_progress. Idempotent via UNIQUE(interview_id).
 *
 * Wrapped with processInterviewRetentionSafely for API routes — hard failures log and return null.
 */

import { createServiceClient } from '@/lib/supabase/server';
import type { DimensionScores } from '@/types/app.types';
import type { SessionQualityRow, UserProgressRow } from '@/lib/retention/types';
import { checkAndUnlockTier } from './tier-unlock';
import { MAX_TIER, type BadgeKey } from './constants';
import { logger } from './logger';
import { buildSessionQualityFeedback, type SessionQualityFeedback } from './quality-feedback';
import { evaluateQuality, updateStreak } from './streak-tracker';
import {
  lifetimeMaxDimensionScore,
  maxDimensionScore,
  meanSessionScore,
  rollingAverage,
  roundToTwo,
  summarize,
} from './scoring';
import { buildCompletionReinforcement } from './completion-reinforcement';
import { computeNextTierProgressPercent, formatProgressMessage } from './format-progress-message';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { applyReferralBonus } from '@/lib/referral/apply-referral';
import { scriptEvalDimsToV1Shape } from '@/lib/interview/script-dimension-bridge';
import {
  computeScriptAvgAnswerDurationSec,
  selectCoreAnsweredTurns,
  type ScriptTurnDurationRow,
} from '@/lib/retention/script-answer-duration';

const PG_UNIQUE_VIOLATION = '23505';

type RetentionSessionAggregate = {
  sessionScore: number;
  avgDimensionScores: DimensionScores;
  questionsAnswered: number;
  totalQuestions: number;
  avgAnswerDurationSec: number;
};

export interface InterviewRetentionClientPayload {
  currentTier: number;
  streak: number;
  totalXp: number;
  sessionLogged: boolean;
  qualityMet: boolean;
  /** Present when qualityMet is false and session was logged. */
  qualityFeedback?: SessionQualityFeedback | null;
  tierUnlocked: boolean;
  previousTier: number | null;
  newTier: number | null;
  newBadges: BadgeKey[];
  xpEarned?: number;
  nextUnlockTeaser?: string | null;
  streakLabel?: string;
  recoveryHint?: string | null;
  /**
   * Tier the user is now progressing toward (null at max tier). Present on
   * every response — not just unlock moments — so a celebration dialog
   * wired to this payload can show "Next: Tier N" immediately after the
   * unlock it just displayed, without a second round trip.
   */
  nextTierNumber?: number | null;
  /** 0–100 visual fill toward {@link nextTierNumber}. */
  nextTierProgressPercent?: number;
}

async function aggregateV1EvaluationsFromInterview(
  interviewId: string,
): Promise<{
  sessionScore: number;
  avgDimensionScores: DimensionScores;
} | null> {
  const supabase = createServiceClient();
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id')
    .eq('interview_id', interviewId);

  if (qErr || !questions?.length) return null;

  const qIds = questions.map((q) => q.id as string);
  const { data: answers, error: aErr } = await supabase
    .from('answers')
    .select('id')
    .in('question_id', qIds);

  if (aErr || !answers?.length) return null;

  const ansIds = answers.map((a) => a.id as string);
  const { data: evaluations, error: eErr } = await supabase
    .from('evaluations')
    .select('overall_score, dimension_scores')
    .in('answer_id', ansIds);

  if (eErr || !evaluations?.length) return null;

  const sums: DimensionScores = {
    communication_clarity: 0,
    technical_depth: 0,
    answer_structure: 0,
    confidence: 0,
    relevance: 0,
  };

  let overall = 0;
  for (const ev of evaluations) {
    overall += Number(ev.overall_score);
    const d = ev.dimension_scores as DimensionScores;
    sums.communication_clarity += d.communication_clarity;
    sums.technical_depth += d.technical_depth;
    sums.answer_structure += d.answer_structure;
    sums.confidence += d.confidence;
    sums.relevance += d.relevance;
  }

  const n = evaluations.length;
  const avg: DimensionScores = {
    communication_clarity: roundToTwo(sums.communication_clarity / n),
    technical_depth: roundToTwo(sums.technical_depth / n),
    answer_structure: roundToTwo(sums.answer_structure / n),
    confidence: roundToTwo(sums.confidence / n),
    relevance: roundToTwo(sums.relevance / n),
  };

  return { sessionScore: roundToTwo(overall / n), avgDimensionScores: avg };
}

/**
 * Aggregate scored v2.1 answer_evaluations into retention session scores.
 * Uses score-v1.2 → V1 dimension bridge so session_quality_log stays on DimensionScores.
 *
 * Per-answer audit rows store dimensions as `{ score, note }` objects — not flat
 * averages. Duration uses script_turns.answered_at (submit moment), never
 * interviewer / closing turn created_at gaps.
 */
async function aggregateScriptEvaluationsFromInterview(
  interviewId: string,
  _startedAtIso: string | null,
  questionCount: number,
): Promise<RetentionSessionAggregate | null> {
  const supabase = createServiceClient();
  const totalQuestions = Math.max(1, questionCount);

  const { data: evaluations, error: eErr } = await supabase
    .from('answer_evaluations')
    .select('overall, dimensions, status, created_at, turn_index')
    .eq('interview_id', interviewId)
    .eq('status', 'scored')
    .order('turn_index', { ascending: true });

  if (eErr || !evaluations?.length) return null;

  const scored: { overall: number; dims: DimensionScores; turn_index: number }[] = [];
  for (const ev of evaluations) {
    const overall = Number(ev.overall);
    if (!Number.isFinite(overall)) continue;
    const mapped = scriptEvalDimsToV1Shape(ev.dimensions);
    if (!mapped) continue;
    scored.push({
      overall,
      dims: mapped,
      turn_index: Number(ev.turn_index) || 0,
    });
  }
  if (scored.length === 0) return null;

  const sums: DimensionScores = {
    communication_clarity: 0,
    technical_depth: 0,
    answer_structure: 0,
    confidence: 0,
    relevance: 0,
  };
  let overallSum = 0;
  for (const ev of scored) {
    overallSum += ev.overall;
    sums.communication_clarity += ev.dims.communication_clarity;
    sums.technical_depth += ev.dims.technical_depth;
    sums.answer_structure += ev.dims.answer_structure;
    sums.confidence += ev.dims.confidence;
    sums.relevance += ev.dims.relevance;
  }

  const n = scored.length;
  const avgDimensionScores: DimensionScores = {
    communication_clarity: roundToTwo(sums.communication_clarity / n),
    technical_depth: roundToTwo(sums.technical_depth / n),
    answer_structure: roundToTwo(sums.answer_structure / n),
    confidence: roundToTwo(sums.confidence / n),
    relevance: roundToTwo(sums.relevance / n),
  };

  const { data: turns } = await supabase
    .from('script_turns')
    .select(
      'turn_index, phase, is_question, submitted_as, answer_text, created_at, answered_at, timer_seconds, llm_output, structured_answer',
    )
    .eq('interview_id', interviewId)
    .order('turn_index', { ascending: true });

  const turnRows = (turns ?? []) as ScriptTurnDurationRow[];
  const coreAnswered = selectCoreAnsweredTurns(turnRows);
  const questionsAnswered = Math.min(coreAnswered.length, totalQuestions);
  const avgAnswerDurationSec = computeScriptAvgAnswerDurationSec(turnRows);

  return {
    sessionScore: roundToTwo(overallSum / n),
    avgDimensionScores,
    questionsAnswered,
    totalQuestions,
    avgAnswerDurationSec,
  };
}

function computeAvgAnswerDurationSec(opts: {
  startedAtIso: string | null;
  rows: { submitted_at: string }[];
}): number {
  const { rows, startedAtIso } = opts;
  if (rows.length === 0) return 0;

  const times = [...rows]
    .map((r) => Date.parse(r.submitted_at))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (times.length === 0) return 0;

  const startAnchor =
    startedAtIso && Number.isFinite(Date.parse(startedAtIso)) ? Date.parse(startedAtIso) : null;

  const deltas: number[] = [];
  if (startAnchor !== null) {
    for (let i = 0; i < times.length; i++) {
      if (i === 0) {
        deltas.push(Math.max(0, Math.round((times[i] - startAnchor) / 1000)));
      } else {
        deltas.push(Math.max(0, Math.round((times[i] - times[i - 1]) / 1000)));
      }
    }
  } else if (times.length >= 2) {
    /** No interview start time: infer per-step duration from gaps only (avoids a bogus 0s first delta). */
    for (let i = 1; i < times.length; i++) {
      deltas.push(Math.max(0, Math.round((times[i] - times[i - 1]) / 1000)));
    }
  } else {
    return 0;
  }

  if (deltas.length === 0) return 0;
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  return Math.round(mean);
}

/**
 * Builds the real outcome of THIS session's retention processing when it was
 * already logged by a prior call (background `after()` from the turn route,
 * a retry, or the concurrent-insert loser) rather than by the caller that is
 * awaiting this return value.
 *
 * Root cause this fixes: the old `idlePayload` short-circuit on this path
 * always reported `tierUnlocked: false, newBadges: []` — even when a tier
 * genuinely unlocked — because it never looked at what the processing that
 * actually ran had produced. For v2.1 interviews specifically, the turn
 * route's background `after()` almost always wins the race to insert
 * `session_quality_log` before the client's own `/api/interview/script/complete`
 * call arrives, so that client call is the one a celebration UI awaits — and
 * it always saw the blank idle shape. `session_quality_log.unlock_contribution`
 * already durably records what that earlier run produced (tier_unlocked,
 * badge_earned, xp_gained) — read it instead of assuming nothing happened.
 */
async function buildPayloadFromExistingLog(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  interviewId: string,
): Promise<InterviewRetentionClientPayload> {
  const [{ data: logRow }, { data: progressRaw }] = await Promise.all([
    supabase
      .from('session_quality_log')
      .select('session_score, quality_met, unlock_contribution')
      .eq('interview_id', interviewId)
      .maybeSingle(),
    supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  const progress = progressRaw as UserProgressRow | null;
  const currentTier = Number(progress?.current_tier ?? 1) || 1;
  const contribution =
    logRow?.unlock_contribution && typeof logRow.unlock_contribution === 'object'
      ? (logRow.unlock_contribution as Record<string, unknown>)
      : {};

  const newTier =
    typeof contribution.tier_unlocked === 'number' ? contribution.tier_unlocked : null;
  const badgeEarned =
    typeof contribution.badge_earned === 'string' ? (contribution.badge_earned as BadgeKey) : null;
  const xpGained =
    typeof contribution.xp_gained === 'number' && Number.isFinite(contribution.xp_gained)
      ? Math.max(0, Math.round(contribution.xp_gained))
      : 0;

  const progressSlice = {
    total_sessions: Number(progress?.total_sessions ?? 0) || 0,
    sessions_at_current_tier: Number(progress?.sessions_at_current_tier ?? 0) || 0,
    max_dimension_score: progress?.max_dimension_score ?? null,
    last_5_sessions_avg: progress?.last_5_sessions_avg ?? null,
    overall_avg_score: progress?.overall_avg_score ?? null,
  };
  const { nextTierNumber, percentTowardNext: nextTierProgressPercent } =
    computeNextTierProgressPercent(currentTier, progressSlice);

  return {
    currentTier,
    streak: Number(progress?.current_streak ?? 0) || 0,
    totalXp: Number(progress?.total_xp ?? 0) || 0,
    sessionLogged: false,
    qualityMet: Boolean(logRow?.quality_met),
    tierUnlocked: newTier !== null,
    previousTier: newTier !== null ? newTier - 1 : null,
    newTier,
    newBadges: badgeEarned ? [badgeEarned] : [],
    xpEarned: xpGained,
    nextUnlockTeaser: currentTier < MAX_TIER ? formatProgressMessage(currentTier, progressSlice) : null,
    nextTierNumber,
    nextTierProgressPercent,
  };
}

/**
 * Ground truth for `user_progress.total_sessions`: a COUNT of the user's
 * `interviews` rows with `status = 'completed'`.
 *
 * Deliberately NOT derived from `session_quality_log` row count. A completed
 * interview whose evaluations never persisted (`aggregateEvaluationsFromInterview`
 * returns null, or dimension scores are incomplete) throws before the
 * session_quality_log insert below ever runs — that interview is genuinely
 * completed but never gets a log row. Counting log rows silently undercounts
 * real completed sessions (observed production drift: 46 completed interviews
 * vs. 30 log rows for the same user). `status = 'completed'` is already
 * written to `interviews` before this pipeline ever runs (see the two
 * `/api/interview/complete` write paths), so this count always includes the
 * interview currently being processed.
 *
 * Returns null (rather than 0) on a read failure so callers can choose to
 * leave the existing `total_sessions` value untouched instead of clobbering
 * it with a false zero.
 */
async function getCompletedInterviewCount(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<number | null> {
  const { count, error } = await supabase
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (error) {
    logger.error('completed_interview_count_failed', { userId, error: error.message });
    return null;
  }
  return count ?? 0;
}

/**
 * Recompute the pure roll-up counters on `user_progress` from the durable
 * `session_quality_log` rows (overall avg, last-5 avg, lifetime max dimension)
 * plus the completed-interview count (total_sessions — see
 * {@link getCompletedInterviewCount}). All four are a pure function of durable
 * state, so recomputing them is safe and idempotent.
 *
 * Called in two situations:
 *   1. Self-repair a PARTIAL WRITE on retry: a prior attempt inserted the
 *      quality-log row but failed before the roll-up landed (root-cause F3).
 *   2. Immediately after every fresh session_quality_log insert (not just on
 *      retry) — so a later throw in this same call (unlock/streak/etc.) cannot
 *      leave user_progress stale without requiring a second /complete call to
 *      repair it.
 *
 * Does NOT touch tier / streak / XP state — those depend on unlock history
 * that is not reconstructable from the log alone.
 */
async function recomputeProgressRollupsFromLogs(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<void> {
  const { data: rows, error: readErr } = await supabase
    .from('session_quality_log')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (readErr) {
    logger.error('retention_rollup_recompute_read_failed', { userId, error: readErr.message });
    return;
  }

  const summary = summarize((rows ?? []) as SessionQualityRow[]);
  const completedCount = await getCompletedInterviewCount(supabase, userId);

  const update: Record<string, unknown> = {
    overall_avg_score: summary.overallAvg,
    last_5_sessions_avg: summary.last5Avg,
    max_dimension_score: summary.maxDimensionScoreLifetime,
  };
  // Omit rather than write a false 0 if the count read failed.
  if (completedCount !== null) update.total_sessions = completedCount;

  const { error: upErr } = await supabase
    .from('user_progress')
    .update(update)
    .eq('user_id', userId);

  if (upErr) {
    logger.error('retention_rollup_recompute_update_failed', { userId, error: upErr.message });
  }
}

/**
 * Self-repair when session_quality_log exists but streak / XP / rollups never
 * finished (partial write or unique-conflict loser). Idempotent:
 * - streak: updateStreak same-day no-op
 * - XP: only when unlock_contribution.progress_applied !== true (new rows start
 *   false; legacy rows without the flag repair only when progress is clearly
 *   untouched — streak 0 + null last_quality_session_date + total_xp 0)
 */
async function reconcileExistingSessionLog(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  interviewId: string,
): Promise<void> {
  await recomputeProgressRollupsFromLogs(supabase, userId);
  // Best-effort tier unlock — same degrade path as first-time completion.
  await checkAndUnlockTier({ userId }).catch((err) => {
    logger.error('retention_reconcile_unlock_failed', {
      userId,
      interviewId,
      error: err instanceof Error ? err.message : 'unknown',
    });
  });

  const { data: logRow, error: logErr } = await supabase
    .from('session_quality_log')
    .select(
      'user_id, quality_met, questions_answered, total_questions, avg_answer_duration_sec, session_score, unlock_contribution, completed_at',
    )
    .eq('interview_id', interviewId)
    .maybeSingle();

  if (logErr || !logRow) {
    if (logErr) {
      logger.error('retention_reconcile_log_read_failed', {
        userId,
        interviewId,
        error: logErr.message,
      });
    }
    return;
  }

  if (typeof logRow.user_id === 'string' && logRow.user_id !== userId) {
    logger.error('retention_reconcile_user_mismatch', { userId, interviewId });
    return;
  }

  const contribution =
    logRow.unlock_contribution && typeof logRow.unlock_contribution === 'object'
      ? ({ ...(logRow.unlock_contribution as Record<string, unknown>) } as Record<
          string,
          unknown
        >)
      : {};

  // Snapshot progress BEFORE streak mutation — legacy XP eligibility depends on
  // pre-repair counters (post-streak last_quality_session_date would hide XP debt).
  const { data: progressBefore } = await supabase
    .from('user_progress')
    .select('total_xp, current_streak, last_quality_session_date')
    .eq('user_id', userId)
    .maybeSingle();

  const qualityMet = logRow.quality_met === true;
  const intendedXp =
    typeof contribution.xp_gained === 'number' && Number.isFinite(contribution.xp_gained)
      ? Math.max(0, Math.round(contribution.xp_gained))
      : qualityMet
        ? Math.round((Number(logRow.session_score) || 0) * 10)
        : 0;

  const progressApplied = contribution.progress_applied === true;
  const explicitlyPending = contribution.progress_applied === false;
  const legacyUntouchedProgress =
    contribution.progress_applied == null &&
    qualityMet &&
    intendedXp > 0 &&
    Number(progressBefore?.total_xp ?? 0) === 0 &&
    Number(progressBefore?.current_streak ?? 0) === 0 &&
    progressBefore?.last_quality_session_date == null;

  const shouldApplyXp =
    qualityMet && intendedXp > 0 && !progressApplied && (explicitlyPending || legacyUntouchedProgress);

  const sessionCompletedAt =
    typeof logRow.completed_at === 'string' && Number.isFinite(Date.parse(logRow.completed_at))
      ? new Date(logRow.completed_at)
      : undefined;

  const streakResult = await updateStreak(
    userId,
    {
      interviewId,
      questionsAnswered: Number(logRow.questions_answered) || 0,
      totalQuestions: Math.max(1, Number(logRow.total_questions) || 1),
      avgAnswerDurationSec: Number(logRow.avg_answer_duration_sec) || 0,
      sessionScore: Number(logRow.session_score) || 0,
    },
    sessionCompletedAt ? { now: sessionCompletedAt } : {},
  );

  if (!streakResult.ok) {
    logger.error('retention_streak_repair_failed', {
      userId,
      interviewId,
      reasonCode: streakResult.reasonCode,
      message: streakResult.message,
    });
    return;
  }

  const streakDelta = streakResult.newStreak - streakResult.previousStreak;
  const priorDelta =
    typeof contribution.streak_delta === 'number' ? contribution.streak_delta : 0;
  if (priorDelta === 0 && streakDelta !== 0) {
    contribution.streak_delta = streakDelta;
  }

  if (shouldApplyXp) {
    // Claim before mutating XP so a concurrent reconciler cannot double-award.
    contribution.progress_applied = true;
    contribution.xp_gained = intendedXp;
    const { error: claimErr } = await supabase
      .from('session_quality_log')
      .update({ unlock_contribution: contribution })
      .eq('interview_id', interviewId);

    if (claimErr) {
      logger.error('retention_xp_repair_claim_failed', {
        userId,
        interviewId,
        error: claimErr.message,
      });
      return;
    }

    const nextXp = Math.max(0, Number(progressBefore?.total_xp ?? 0) + intendedXp);
    const { error: xpErr } = await supabase
      .from('user_progress')
      .update({ total_xp: nextXp })
      .eq('user_id', userId);

    if (xpErr) {
      // Roll claim back so a later retry can re-attempt XP.
      contribution.progress_applied = false;
      await supabase
        .from('session_quality_log')
        .update({ unlock_contribution: contribution })
        .eq('interview_id', interviewId);
      logger.error('retention_xp_repair_failed', {
        userId,
        interviewId,
        error: xpErr.message,
      });
      return;
    }

    logger.info('retention_xp_repaired', { userId, interviewId, xpAdded: intendedXp, nextXp });
  } else if (priorDelta === 0 && streakDelta !== 0) {
    // Streak repaired without XP claim — persist streak_delta only.
    const { error: patchErr } = await supabase
      .from('session_quality_log')
      .update({ unlock_contribution: contribution })
      .eq('interview_id', interviewId);
    if (patchErr) {
      logger.error('retention_streak_repair_contribution_failed', {
        userId,
        interviewId,
        error: patchErr.message,
      });
    }
  }
}

export async function processInterviewRetention(
  userId: string,
  interviewId: string,
): Promise<InterviewRetentionClientPayload> {
  const supabase = createServiceClient();

  const { data: existingLog } = await supabase
    .from('session_quality_log')
    .select('id')
    .eq('interview_id', interviewId)
    .maybeSingle();

  if (existingLog) {
    // Self-repair partial writes (log inserted, streak/XP/roll-up never landed).
    await reconcileExistingSessionLog(supabase, userId, interviewId);
    logger.info('retention_session_skip', { interviewId, reason: 'session_quality_log exists' });
    return buildPayloadFromExistingLog(supabase, userId, interviewId);
  }

  const { data: progressRowBeforeRaw, error: progErrBefore } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (progErrBefore || !progressRowBeforeRaw) {
    logger.error('retention_abort_no_progress', {
      userId,
      interviewId,
      error: progErrBefore?.message,
    });
    throw new Error(progErrBefore?.message ?? 'user_progress missing');
  }

  const progressRowBefore = progressRowBeforeRaw as UserProgressRow;

  const tierBeforeUnlock = Number(progressRowBefore.current_tier) || 1;
  const sessionsAtBeforeUnlock = progressRowBefore.sessions_at_current_tier ?? 0;

  const { data: interview, error: intErr } = await supabase
    .from('interviews')
    .select('id, question_count, started_at, role, engine')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (intErr || !interview) {
    logger.error('retention_interview_load_failed', { interviewId, error: intErr?.message });
    throw new Error(intErr?.message ?? 'interview not found');
  }

  const engine = typeof interview.engine === 'string' ? interview.engine : null;
  const startedAtIso = interview.started_at as string | null;
  const questionCount = Math.max(1, Number(interview.question_count) || 1);

  let sessionAgg: RetentionSessionAggregate | null = null;

  if (engine === 'v2.1') {
    sessionAgg = await aggregateScriptEvaluationsFromInterview(
      interviewId,
      startedAtIso,
      questionCount,
    );
  } else {
    const { data: questionsOrdered, error: qErr } = await supabase
      .from('questions')
      .select('id, order_index')
      .eq('interview_id', interviewId)
      .order('order_index', { ascending: true });

    if (qErr || !questionsOrdered?.length) {
      logger.error('retention_questions_load_failed', { interviewId, error: qErr?.message });
      throw new Error(qErr?.message ?? 'no questions');
    }

    const qIds = questionsOrdered.map((q) => q.id as string);
    const { data: answers, error: aErr } = await supabase
      .from('answers')
      .select('id, question_id, submitted_at')
      .in('question_id', qIds);

    if (aErr) {
      logger.error('retention_answers_load_failed', { interviewId, error: aErr.message });
      throw new Error(aErr.message);
    }

    const answersSorted = [...(answers ?? [])].sort(
      (a, b) =>
        questionsOrdered.findIndex((q) => q.id === a.question_id) -
        questionsOrdered.findIndex((q) => q.id === b.question_id),
    );

    // Count DISTINCT questions answered, not raw answer rows: a single question
    // can have multiple answer rows now that the orchestrator asks in-place
    // follow-ups. Capped at totalQuestions so it can never exceed it (the
    // session_quality_log `answered_le_total` check constraint).
    const distinctAnsweredQuestionIds = new Set(
      (answers ?? []).map((a) => a.question_id as string),
    );
    const questionsAnswered = Math.min(
      distinctAnsweredQuestionIds.size,
      questionCount,
    );
    const avgAnswerDurationSec = computeAvgAnswerDurationSec({
      startedAtIso,
      rows: answersSorted.map((a) => ({ submitted_at: a.submitted_at as string })),
    });

    const agg = await aggregateV1EvaluationsFromInterview(interviewId);
    if (agg) {
      sessionAgg = {
        sessionScore: agg.sessionScore,
        avgDimensionScores: agg.avgDimensionScores,
        questionsAnswered,
        totalQuestions: questionCount,
        avgAnswerDurationSec,
      };
    }
  }

  if (!sessionAgg) {
    logger.error('retention_no_evaluations', { interviewId, engine });
    throw new Error('No evaluations for interview');
  }

  const {
    sessionScore,
    avgDimensionScores,
    questionsAnswered,
    totalQuestions,
    avgAnswerDurationSec,
  } = sessionAgg;
  const questionsSkipped = Math.max(0, totalQuestions - questionsAnswered);

  const maxDim = maxDimensionScore(avgDimensionScores);
  if (maxDim === null) {
    throw new Error('Dimension scores incomplete');
  }

  const qualityVerdict = evaluateQuality({
    interviewId,
    questionsAnswered,
    totalQuestions,
    avgAnswerDurationSec,
    sessionScore,
  });
  const qualityMet = qualityVerdict.passed;
  const qualityFeedback = buildSessionQualityFeedback(qualityVerdict, {
    sessionScore,
    questionsAnswered,
    totalQuestions,
    avgAnswerDurationSec,
  });

  const xpAdded = qualityMet ? Math.round(sessionScore * 10) : 0;
  const totalXpNext = Math.max(0, (progressRowBefore.total_xp ?? 0) + xpAdded);

  const placeholderContribution = {
    tier_unlocked: null as number | null,
    streak_delta: 0,
    badge_earned: null as BadgeKey | null,
    xp_gained: xpAdded,
    /** Flipped true only after streak + XP progress mutations succeed. */
    progress_applied: false,
  };

  const insertRow = {
    user_id: userId,
    interview_id: interviewId,
    questions_answered: questionsAnswered,
    total_questions: totalQuestions,
    questions_skipped: questionsSkipped,
    avg_answer_duration_sec: avgAnswerDurationSec,
    session_score: sessionScore,
    quality_met: qualityMet,
    dimension_scores: avgDimensionScores,
    max_dimension_score: roundToTwo(maxDim),
    unlock_contribution: placeholderContribution,
  };

  const { error: insErr } = await supabase.from('session_quality_log').insert(insertRow);

  if (insErr?.code === PG_UNIQUE_VIOLATION) {
    // Concurrent winner already inserted — reconcile missing streak/XP instead of
    // returning idle and permanently stranding a partial write (prod 3195be3e).
    logger.info('retention_unique_conflict_reconcile', { userId, interviewId });
    await reconcileExistingSessionLog(supabase, userId, interviewId);
    return buildPayloadFromExistingLog(supabase, userId, interviewId);
  }
  if (insErr) {
    logger.error('session_quality_insert_failed', { interviewId, error: insErr.message });
    throw new Error(insErr.message);
  }

  // Sync the pure roll-up counters immediately — not only on a retry's
  // existingLog short-circuit. If checkAndUnlockTier/updateStreak/anything
  // below throws, user_progress is already caught up on this session rather
  // than staying stale until (if ever) another /complete call retries.
  await recomputeProgressRollupsFromLogs(supabase, userId);

  const unlockResult = await checkAndUnlockTier({ userId });

  const unlockedOk = unlockResult.ok === true && unlockResult.unlocked === true;
  const unlockTierNew = unlockedOk ? unlockResult.newTier : null;

  logger.info('retention_analytics_attempt', {
    interviewId,
    unlocked: unlockedOk,
    ...(unlockedOk
      ? {
          previousTier: unlockResult.previousTier,
          newTier: unlockResult.newTier,
        }
      : {
          ok: unlockResult.ok,
          reasonCode: 'reasonCode' in unlockResult ? unlockResult.reasonCode : undefined,
        }),
    qualityMet,
    sessionScore,
  });

  if (unlockedOk) {
    logger.info('retention_analytics_unlock', {
      interviewId,
      previousTier: unlockResult.previousTier,
      newTier: unlockResult.newTier,
    });
  }

  let newBadges: BadgeKey[] = [];
  let streakForPayload = progressRowBefore.current_streak ?? 0;

  const streakResult = await updateStreak(userId, {
    interviewId,
    questionsAnswered,
    totalQuestions,
    avgAnswerDurationSec,
    sessionScore,
  });

  if (!streakResult.ok) {
    logger.error('retention_update_streak_failed', {
      userId,
      interviewId,
      reasonCode: streakResult.reasonCode,
      message: streakResult.message,
    });
    throw new Error(streakResult.message);
  }

  streakForPayload = streakResult.newStreak;
  newBadges = streakResult.newlyEarnedBadges;

  const streakDelta = streakResult.newStreak - streakResult.previousStreak;

  if (qualityMet && streakDelta > 0) {
    trackProductEventServer({ event: 'streak_extended', userId, interviewId, streak: streakResult.newStreak });
  } else if (streakResult.newStreak < streakResult.previousStreak) {
    trackProductEventServer({ event: 'streak_broken', userId, interviewId, streak: streakResult.newStreak });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('plan_tier')
    .eq('id', userId)
    .maybeSingle();

  trackFunnelEvent(
    'mock_interview_completed',
    {
      userId,
      interviewId,
      role: typeof interview.role === 'string' ? interview.role : undefined,
      plan: typeof userRow?.plan_tier === 'string' ? userRow.plan_tier : undefined,
      source: 'interview_complete',
      qualityMet,
      sessionScore,
      score: sessionScore,
    },
    { ga4: false },
  );

  void applyReferralBonus(supabase, userId).catch((err) => {
    logger.error('referral_apply_failed', {
      userId,
      interviewId,
      error: err instanceof Error ? err.message : 'unknown',
    });
  });

  const { data: afterUnlockProg } = await supabase
    .from('user_progress')
    .select('current_tier, sessions_at_current_tier')
    .eq('user_id', userId)
    .maybeSingle();

  const tierAfterRpc = Number(afterUnlockProg?.current_tier ?? tierBeforeUnlock);
  /** RPC resets sessions_at when tier advances successfully. Otherwise increment legacy counter. */
  const sessionsAtTier =
    tierAfterRpc > tierBeforeUnlock
      ? Number(afterUnlockProg?.sessions_at_current_tier ?? 0)
      : sessionsAtBeforeUnlock + 1;

  const { data: allSessionsOrdered } = await supabase
    .from('session_quality_log')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  const rollupRows = (allSessionsOrdered ?? []) as SessionQualityRow[];

  const overallAvgRollup = rollupRows.length > 0 ? meanSessionScore(rollupRows) : null;
  const last5AvgRollup =
    rollupRows.length > 0 ? rollingAverage(rollupRows, 5) : null;
  const maxDimRollup =
    rollupRows.length > 0 ? lifetimeMaxDimensionScore(rollupRows) : null;
  // Ground truth for total_sessions is the completed-interview COUNT (see
  // getCompletedInterviewCount), not the log-row count — falls back to the
  // log-row count only if the count query itself failed.
  const completedCountFinal = await getCompletedInterviewCount(supabase, userId);
  const totalSessionsFinal = completedCountFinal ?? rollupRows.length;

  const { error: upErr } = await supabase
    .from('user_progress')
    .update({
      total_sessions: totalSessionsFinal,
      overall_avg_score: overallAvgRollup ?? null,
      last_5_sessions_avg: last5AvgRollup ?? null,
      max_dimension_score: maxDimRollup ?? null,
      total_xp: totalXpNext,
      sessions_at_current_tier: sessionsAtTier,
    })
    .eq('user_id', userId);

  if (upErr) {
    logger.error('user_progress_update_failed', { userId, error: upErr.message });
    throw new Error(upErr.message);
  }

  // Mark progress applied only after user_progress XP/rollup write succeeds so a
  // crash between insert and here remains repairable without double XP.
  const { error: contribErr } = await supabase
    .from('session_quality_log')
    .update({
      unlock_contribution: {
        tier_unlocked: unlockTierNew ?? null,
        streak_delta: streakDelta,
        badge_earned: newBadges[0] ?? null,
        xp_gained: xpAdded,
        progress_applied: true,
      },
    })
    .eq('interview_id', interviewId);

  if (contribErr) {
    logger.error('retention_contribution_finalize_failed', {
      userId,
      interviewId,
      error: contribErr.message,
    });
    // Progress already written — do not throw (would look like total failure).
  }

  const progressSliceAfter = {
    total_sessions: totalSessionsFinal,
    sessions_at_current_tier: sessionsAtTier,
    max_dimension_score: maxDimRollup,
    last_5_sessions_avg: last5AvgRollup,
    overall_avg_score: overallAvgRollup,
  };

  const reinforcement = buildCompletionReinforcement({
    xpEarned: xpAdded,
    qualityMet,
    newStreak: streakForPayload,
    previousStreak: streakResult.previousStreak,
    currentTier: tierAfterRpc,
    progressSlice: progressSliceAfter,
  });

  const { nextTierNumber, percentTowardNext: nextTierProgressPercent } =
    computeNextTierProgressPercent(tierAfterRpc, progressSliceAfter);

  return {
    currentTier: tierAfterRpc,
    streak: streakForPayload,
    totalXp: totalXpNext,
    sessionLogged: true,
    qualityMet,
    qualityFeedback: qualityMet ? null : qualityFeedback,
    tierUnlocked: unlockedOk,
    previousTier: unlockedOk ? tierBeforeUnlock : null,
    newTier: unlockTierNew ?? null,
    newBadges,
    xpEarned: reinforcement.xpEarned,
    nextUnlockTeaser: reinforcement.nextUnlockTeaser,
    streakLabel: reinforcement.streakLabel,
    recoveryHint: reinforcement.recoveryHint,
    nextTierNumber,
    nextTierProgressPercent,
  };
}

export async function processInterviewRetentionSafely(
  userId: string,
  interviewId: string,
): Promise<InterviewRetentionClientPayload | null> {
  try {
    return await processInterviewRetention(userId, interviewId);
  } catch (err) {
    // Non-blocking for /complete, but NOT silent: emit a stable, countable
    // structured marker (grep `retention_pipeline_failed`) with interview_id so
    // retention failures can be alerted/graphed per interview instead of
    // vanishing into a null return (root-cause F3).
    logger.error('retention_pipeline_failed', {
      userId,
      interviewId,
      failed: true,
      error: err instanceof Error ? err.message : 'unknown_error',
    });
    return null;
  }
}
