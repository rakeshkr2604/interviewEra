/**
 * Derives a cumulative XP-over-time series for the "Points journey" chart
 * from `session_quality_log` rows — no new table, no new write path. XP is
 * already durable per session (`unlock_contribution.xp_gained`, 0 for
 * non-quality sessions); this just walks completed_at order and sums it.
 */

export interface PointsJourneySessionRow {
  completed_at: string;
  unlock_contribution: { xp_gained?: unknown } | Record<string, never> | null;
}

export interface PointsJourneyPoint {
  dateLabel: string;
  /** Cumulative XP as of this session. */
  cumulativeXp: number;
}

function xpGainedFrom(row: PointsJourneySessionRow): number {
  const raw = row.unlock_contribution && typeof row.unlock_contribution === 'object'
    ? (row.unlock_contribution as { xp_gained?: unknown }).xp_gained
    : undefined;
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.round(raw)) : 0;
}

/**
 * Builds the cumulative series in chronological order. `rows` may arrive in
 * any order — this sorts by `completed_at` first. Caller should cap `rows`
 * to a reasonable lifetime window upstream (same query the dashboard already
 * runs for session rollups).
 */
export function buildPointsJourney(rows: PointsJourneySessionRow[]): PointsJourneyPoint[] {
  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.completed_at) - Date.parse(b.completed_at),
  );

  let running = 0;
  return sorted.map((row) => {
    running += xpGainedFrom(row);
    return {
      dateLabel: new Date(row.completed_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      }),
      cumulativeXp: running,
    };
  });
}
