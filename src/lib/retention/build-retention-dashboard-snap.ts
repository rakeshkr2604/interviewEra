import type { RetentionDashboardSnapshot } from '@/components/dashboard/RetentionProgressCard';
import { MAX_TIER } from '@/lib/retention/constants';
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
export async function buildRetentionDashboardSnapFromRow(
  row: UserProgressRow | null,
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

  return {
    current_tier,
    current_streak,
    total_xp,
    total_sessions,
    tierProgress,
  };
}
