/**
 * Pure helpers for Performance Analytics — merge V1 + v2.1 reports into a
 * chronological last-N series with engine-aware dimension averages.
 */

import type { DimensionScores } from '@/types/app.types';
import { normalizeRadarRowToDimensionKey } from '@/lib/utils/report-radar-dimensions';
import { scriptReportDimsToV1Shape } from '@/lib/interview/script-dimension-bridge';

export type AnalyticsReportPoint = {
  interviewId: string;
  overallScore: number;
  generatedAt: string | null;
  engine: 'v1' | 'v2.1';
  dimensions: Partial<DimensionScores>;
};

export type V1ReportRow = {
  interview_id: string;
  overall_score: number | null;
  radar_data: unknown;
  generated_at: string | null;
};

export type ScriptReportRow = {
  interview_id: string;
  overall: number | null;
  dimension_averages: unknown;
  generated_at: string | null;
  status: string;
};

function radarToDimensions(radar: unknown): Partial<DimensionScores> {
  const out: Partial<DimensionScores> = {};
  if (!Array.isArray(radar)) return out;
  for (const point of radar) {
    if (!point || typeof point !== 'object') continue;
    const dim = String((point as { dimension?: unknown }).dimension ?? '');
    const key = normalizeRadarRowToDimensionKey(dim);
    const score = Number((point as { score?: unknown }).score);
    if (key == null || !Number.isFinite(score)) continue;
    out[key] = score;
  }
  return out;
}

/** Merge V1 + script reports; prefer script when both exist for the same interview. */
export function mergeAnalyticsReports(
  v1Reports: V1ReportRow[],
  scriptReports: ScriptReportRow[],
  limit = 5,
): AnalyticsReportPoint[] {
  const byInterview = new Map<string, AnalyticsReportPoint>();

  for (const r of v1Reports) {
    if (r.overall_score == null || !Number.isFinite(Number(r.overall_score))) continue;
    byInterview.set(r.interview_id, {
      interviewId: r.interview_id,
      overallScore: Number(r.overall_score),
      generatedAt: r.generated_at,
      engine: 'v1',
      dimensions: radarToDimensions(r.radar_data),
    });
  }

  for (const r of scriptReports) {
    if (r.status !== 'ready' && r.status !== 'partial') continue;
    if (r.overall == null || !Number.isFinite(Number(r.overall))) continue;
    const mapped = scriptReportDimsToV1Shape(r.dimension_averages);
    byInterview.set(r.interview_id, {
      interviewId: r.interview_id,
      overallScore: Number(r.overall),
      generatedAt: r.generated_at,
      engine: 'v2.1',
      dimensions: mapped ?? {},
    });
  }

  return Array.from(byInterview.values())
    .sort((a, b) => (b.generatedAt ?? '').localeCompare(a.generatedAt ?? ''))
    .slice(0, limit)
    .reverse();
}

export function computeImprovementPercent(
  baseline: number | null,
  latest: number | null,
): number | null {
  if (baseline == null || latest == null) return null;
  if (!Number.isFinite(baseline) || !Number.isFinite(latest) || baseline <= 0) return null;
  return Math.round(((latest - baseline) / baseline) * 100);
}

export function averageDimensions(
  points: AnalyticsReportPoint[],
): Array<{ key: keyof DimensionScores; avg: number }> {
  const buckets: Record<keyof DimensionScores, number[]> = {
    communication_clarity: [],
    technical_depth: [],
    answer_structure: [],
    confidence: [],
    relevance: [],
  };
  for (const point of points) {
    for (const key of Object.keys(buckets) as (keyof DimensionScores)[]) {
      const v = point.dimensions[key];
      if (typeof v === 'number' && Number.isFinite(v)) buckets[key].push(v);
    }
  }
  return (Object.keys(buckets) as (keyof DimensionScores)[])
    .map((key) => {
      const vals = buckets[key];
      if (vals.length === 0) return null;
      return {
        key,
        avg: vals.reduce((a, b) => a + b, 0) / vals.length,
      };
    })
    .filter((row): row is { key: keyof DimensionScores; avg: number } => row != null)
    .sort((a, b) => b.avg - a.avg);
}
