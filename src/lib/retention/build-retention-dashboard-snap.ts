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
const SESSION_QUALITY_SELECT =
  'interview_id, session_score, questions_answered, total_questions, avg_answer_duration_sec, quality_met' as const;

type SessionQualityRow = {
  interview_id: string;
  session_score: number;
  questions_answered: number;
  total_questions: number;
  avg_answer_duration_sec: number;
  quality_met: boolean;
};

function toQualityFeedback(data: SessionQualityRow) {
  return sessionQualityFeedbackFromLogRow({
    interview_id: data.interview_id,
    session_score: Number(data.session_score),
    questions_answered: Number(data.questions_answered),
    total_questions: Number(data.total_questions),
    avg_answer_duration_sec: Number(data.avg_answer_duration_sec),
    quality_met: Boolean(data.quality_met),
  });
}

/**
 * One query answers both the weekly session count and the latest-session
 * feedback: `count: 'exact'` returns the full week total while `limit(1)` keeps
 * the payload to the single newest row. Only a user with no sessions this week
 * needs the bounded fallback for their most recent session ever.
 */
async function loadSessionQualityWindow(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  weekAgo: string,
  wantLatest: boolean,
): Promise<{ weeklySessions: number; latest: SessionQualityRow | null }> {
  const { data, count } = await supabase
    .from('session_quality_log')
    .select(SESSION_QUALITY_SELECT, { count: 'exact' })
    .eq('user_id', userId)
    .gte('completed_at', weekAgo)
    .order('completed_at', { ascending: false })
    .limit(1);

  const rows = (data ?? []) as SessionQualityRow[];
  const weeklySessions = count ?? rows.length;
  if (rows.length > 0 || !wantLatest) {
    return { weeklySessions, latest: rows[0] ?? null };
  }

  const { data: older } = await supabase
    .from('session_quality_log')
    .select(SESSION_QUALITY_SELECT)
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return { weeklySessions, latest: (older as SessionQualityRow | null) ?? null };
}

export async function buildRetentionDashboardSnapFromRow(
  row: UserProgressRow | null,
  userId?: string,
  /** Shared request client — avoids a second `createClient()` per dashboard load. */
  client?: Awaited<ReturnType<typeof createClient>>,
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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [nextCfg, sessionQuality] = await Promise.all([
    current_tier < MAX_TIER ? getTierConfig(current_tier + 1) : Promise.resolve(null),
    userId
      ? (client ? Promise.resolve(client) : createClient()).then((supabase) =>
          loadSessionQualityWindow(supabase, userId, weekAgo, total_sessions > 0),
        )
      : Promise.resolve(null),
  ]);
  const tierProgress =
    current_tier < MAX_TIER ? computeRetentionTierProgressView(progPick, nextCfg) : null;
  const weeklySessions = sessionQuality ? sessionQuality.weeklySessions : undefined;
  const lastSessionQualityFeedback = sessionQuality?.latest
    ? toQualityFeedback(sessionQuality.latest)
    : null;

  const last5 = row?.last_5_sessions_avg ?? null;
  const overall = row?.overall_avg_score ?? null;
  let improvementTrend: string | null = null;
  if (last5 != null && overall != null) {
    const delta = last5 - overall;
    if (delta >= 0.3) improvementTrend = `Improving (+${delta.toFixed(1)} vs lifetime avg)`;
    else if (delta <= -0.3) improvementTrend = `Room to grow (${delta.toFixed(1)} vs lifetime avg)`;
    else improvementTrend = 'Holding steady vs your average';
  }

  const maxDim = row?.max_dimension_score ?? null;
  const bestDimensionLabel =
    maxDim != null ? `Peak score ${maxDim.toFixed(1)}/10 on one dimension` : null;

  return {
    current_tier,
    current_streak,
    total_xp,
    total_sessions,
    weeklySessions,
    bestDimensionLabel,
    improvementTrend,
    tierProgress,
    lastSessionQualityFeedback,
  };
}
