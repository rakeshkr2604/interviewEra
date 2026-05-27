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
import { type BadgeKey } from './constants';
import { logger } from './logger';
import { buildSessionQualityFeedback, type SessionQualityFeedback } from './quality-feedback';
import { evaluateQuality, updateStreak } from './streak-tracker';
import {
  lifetimeMaxDimensionScore,
  maxDimensionScore,
  meanSessionScore,
  rollingAverage,
  roundToTwo,
} from './scoring';

const PG_UNIQUE_VIOLATION = '23505';

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
}

async function aggregateEvaluationsFromInterview(
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

async function idlePayload(
  userId: string,
  interviewId: string,
  reason: string,
): Promise<InterviewRetentionClientPayload> {
  const supabase = createServiceClient();
  const { data: progress } = await supabase
    .from('user_progress')
    .select('current_tier, current_streak, total_xp')
    .eq('user_id', userId)
    .maybeSingle();

  logger.info('retention_session_skip', {
    interviewId,
    reason,
  });

  return {
    currentTier: (progress?.current_tier as number) ?? 1,
    streak: (progress?.current_streak as number) ?? 0,
    totalXp: (progress?.total_xp as number) ?? 0,
    sessionLogged: false,
    qualityMet: false,
    tierUnlocked: false,
    previousTier: null,
    newTier: null,
    newBadges: [],
  };
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
    return idlePayload(userId, interviewId, 'session_quality_log exists');
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
    .select('id, question_count, started_at')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .maybeSingle();

  if (intErr || !interview) {
    logger.error('retention_interview_load_failed', { interviewId, error: intErr?.message });
    throw new Error(intErr?.message ?? 'interview not found');
  }

  const totalQuestions = Math.max(1, Number(interview.question_count) || 1);

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
    totalQuestions,
  );
  const questionsSkipped = Math.max(0, totalQuestions - questionsAnswered);
  const avgAnswerDurationSec = computeAvgAnswerDurationSec({
    startedAtIso: interview.started_at as string | null,
    rows: answersSorted.map((a) => ({ submitted_at: a.submitted_at as string })),
  });

  const agg = await aggregateEvaluationsFromInterview(interviewId);
  if (!agg) {
    logger.error('retention_no_evaluations', { interviewId });
    throw new Error('No evaluations for interview');
  }

  const maxDim = maxDimensionScore(agg.avgDimensionScores);
  if (maxDim === null) {
    throw new Error('Dimension scores incomplete');
  }

  const qualityVerdict = evaluateQuality({
    interviewId,
    questionsAnswered,
    totalQuestions,
    avgAnswerDurationSec,
    sessionScore: agg.sessionScore,
  });
  const qualityMet = qualityVerdict.passed;
  const qualityFeedback = buildSessionQualityFeedback(qualityVerdict, agg.sessionScore);

  const xpAdded = qualityMet ? Math.round(agg.sessionScore * 10) : 0;
  const totalXpNext = Math.max(0, (progressRowBefore.total_xp ?? 0) + xpAdded);

  const placeholderContribution = {
    tier_unlocked: null as number | null,
    streak_delta: 0,
    badge_earned: null as BadgeKey | null,
    xp_gained: xpAdded,
  };

  const insertRow = {
    user_id: userId,
    interview_id: interviewId,
    questions_answered: questionsAnswered,
    total_questions: totalQuestions,
    questions_skipped: questionsSkipped,
    avg_answer_duration_sec: avgAnswerDurationSec,
    session_score: agg.sessionScore,
    quality_met: qualityMet,
    dimension_scores: agg.avgDimensionScores,
    max_dimension_score: roundToTwo(maxDim),
    unlock_contribution: placeholderContribution,
  };

  const { error: insErr } = await supabase.from('session_quality_log').insert(insertRow);

  if (insErr?.code === PG_UNIQUE_VIOLATION) {
    return idlePayload(userId, interviewId, 'unique interview_id conflict');
  }
  if (insErr) {
    logger.error('session_quality_insert_failed', { interviewId, error: insErr.message });
    throw new Error(insErr.message);
  }

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
    sessionScore: agg.sessionScore,
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
    sessionScore: agg.sessionScore,
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

  await supabase
    .from('session_quality_log')
    .update({
      unlock_contribution: {
        tier_unlocked: unlockTierNew ?? null,
        streak_delta: streakDelta,
        badge_earned: newBadges[0] ?? null,
        xp_gained: xpAdded,
      },
    })
    .eq('interview_id', interviewId);

  const { error: upErr } = await supabase
    .from('user_progress')
    .update({
      total_sessions: rollupRows.length,
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
  };
}

export async function processInterviewRetentionSafely(
  userId: string,
  interviewId: string,
): Promise<InterviewRetentionClientPayload | null> {
  try {
    return await processInterviewRetention(userId, interviewId);
  } catch (err) {
    logger.error('processInterviewRetention_outer', {
      userId,
      interviewId,
      error: err instanceof Error ? err.message : 'unknown_error',
    });
    return null;
  }
}
