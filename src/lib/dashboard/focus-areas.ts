import type { ReportDimensionAverages } from '@/lib/candidate/types';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import { V1_KEY_TO_RUBRIC_KEY } from '@/lib/interview/script-dimension-bridge';
import type { FocusAreaRow } from '@/components/candidate/ReadinessFocusAreas';

/**
 * Dashboard Focus Areas — ranks the candidate's weakest dimensions from their
 * already-computed lifetime `dimensionAverages` (same source the Readiness
 * score and Roadmap recommendations use). Zero extra queries: this is a pure
 * reshape of data the dashboard loader already fetched.
 */
export function buildDashboardFocusAreas(
  dimensionAverages: ReportDimensionAverages,
  limit = 5,
): FocusAreaRow[] {
  return (Object.keys(dimensionAverages) as (keyof ReportDimensionAverages)[])
    .map((key) => ({ key, avg: dimensionAverages[key] }))
    .filter((d): d is { key: keyof ReportDimensionAverages; avg: number } => d.avg != null)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit)
    .map((d) => ({
      rubricKey: V1_KEY_TO_RUBRIC_KEY[d.key],
      name: REPORT_DIMENSION_LABELS[d.key],
      pct: Math.round(d.avg * 10),
    }));
}
