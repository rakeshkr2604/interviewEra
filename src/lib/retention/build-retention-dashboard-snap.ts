import type { RetentionDashboardSnapshot } from '@/components/dashboard/RetentionProgressCard';
import { createClient } from '@/lib/supabase/server';
import { MAX_TIER } from '@/lib/retention/constants';
import { sessionQualityFeedbackFromLogRow } from '@/lib/retention/quality-feedback';
import {
  computeRetentionTierProgressView,
  type RetentionTierProgressPick,
} from '@/lib/retention/dashboard-tier-progress';
import { getTierConfig } from '@/lib/retention/helpers';
import type { UserProgressRow } from '@/lib/retention/types';

function pickProgressFields(row: UserProgressRow): RetentionTierProgressPick {
  return {
    current_tier: row.current_tier,
    total_sessions: row.total_sessions,
    sessions_at_current_tier: row.sessions_at_current_tier,
    max_dimension_score: row.max_dimension_score,
    last_5_sessions_avg: row.last_5_sessions_avg,
    overall_avg_score: row.overall_avg_score,
  };
}

/**
 * Builds dashboard props from `user_progress` + `tier_config` for the upcoming tier (server-only I/O inside).
 * When no row exists yet, renders tier-1 scaffolding with gated progress preview.
 */
async function loadLatestFailedSessionQualityFeedback(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('session_quality_log')
    .select(
      'interview_id, session_score, questions_answered, total_questions, avg_answer_duration_sec, quality_met',
    )
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return sessionQualityFeedbackFromLogRow({
    interview_id: data.interview_id as string,
    session_score: Number(data.session_score),
    questions_answered: Number(data.questions_answered),
    total_questions: Number(data.total_questions),
    avg_answer_duration_sec: Number(data.avg_answer_duration_sec),
    quality_met: Boolean(data.quality_met),
  });
}

export async function buildRetentionDashboardSnapFromRow(
  row: UserProgressRow | null,
  userId?: string,
): Promise<RetentionDashboardSnapshot> {
  const current_tier = row
    ? Math.min(MAX_TIER, Math.max(1, Math.round(Number(row.current_tier) || 1)))
    : 1;
  const current_streak = Number(row?.current_streak ?? 0) || 0;
  const total_xp = Number(row?.total_xp ?? 0) || 0;
  const total_sessions = Number(row?.total_sessions ?? 0) || 0;

  const progPick: RetentionTierProgressPick = row
    ? pickProgressFields(row)
    : {
        current_tier: 1,
        total_sessions: 0,
        sessions_at_current_tier: 0,
        max_dimension_score: null,
        last_5_sessions_avg: null,
        overall_avg_score: null,
      };

  const nextCfg =
    current_tier < MAX_TIER ? await getTierConfig(current_tier + 1) : null;
  const tierProgress =
    current_tier < MAX_TIER ? computeRetentionTierProgressView(progPick, nextCfg) : null;

  const lastSessionQualityFeedback =
    userId && total_sessions > 0 ? await loadLatestFailedSessionQualityFeedback(userId) : null;

  return {
    current_tier,
    current_streak,
    total_xp,
    total_sessions,
    tierProgress,
    lastSessionQualityFeedback,
  };
}
