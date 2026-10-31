import type { DimensionScores, RadarDataPoint } from '@/types/app.types';

/** Persisted `reports.radar_data` spider rows — `dimension` matches JSON keys of `DimensionScores`. */
export const REPORT_RADAR_DIMENSION_ORDER: (keyof DimensionScores)[] = [
  'communication_clarity',
  'technical_depth',
  'answer_structure',
  'confidence',
  'relevance',
];

/**
 * Display labels for the V1-shaped `DimensionScores` keys.
 *
 * `technical_depth` and `confidence` are legacy internal key NAMES from the
 * original V1 dimension scheme — current v2.1 interviews bridge different
 * rubric dimensions onto those same slots (see script-dimension-bridge.ts:
 * technical_depth ← content_accuracy, confidence ← specificity), so the
 * labels here reflect what is ACTUALLY being measured today, not the
 * original V1 concept the key name still carries.
 */
export const REPORT_DIMENSION_LABELS: Record<keyof DimensionScores, string> = {
  communication_clarity: 'Communication Clarity',
  technical_depth: 'Content Accuracy',
  answer_structure: 'Answer Structure',
  confidence: 'Specificity',
  relevance: 'Relevance',
};

const DIMENSION_KEYS = new Set<string>(REPORT_RADAR_DIMENSION_ORDER);

/** Pre-key schema + long labels (PDF route previously matched these incorrectly). */
const LEGACY_RADAR_DIMENSION_TO_KEY: Record<string, keyof DimensionScores> = {
  Communication: 'communication_clarity',
  Technical: 'technical_depth',
  Structure: 'answer_structure',
  Confidence: 'confidence',
  Relevance: 'relevance',
  'Communication Clarity': 'communication_clarity',
  'Technical Depth': 'technical_depth',
  'Answer Structure': 'answer_structure',
};

export function normalizeRadarRowToDimensionKey(dimension: string): keyof DimensionScores | null {
  const d = dimension.trim();
  if (DIMENSION_KEYS.has(d)) return d as keyof DimensionScores;
  return LEGACY_RADAR_DIMENSION_TO_KEY[d] ?? null;
}

export function radarScoresByDimensionKey(radar: RadarDataPoint[]): Partial<Record<keyof DimensionScores, number>> {
  const out: Partial<Record<keyof DimensionScores, number>> = {};
  for (const p of radar) {
    const key = normalizeRadarRowToDimensionKey(p.dimension);
    if (key != null) out[key] = p.score;
  }
  return out;
}

export interface DimensionDisplayRow {
  dimensionKey: keyof DimensionScores;
  label: string;
  score: number | null;
}

/** Ordered rows for PDF + web — lookup by `dimensionKey`, stable order. */
export function dimensionDisplayRowsFromRadar(radar: RadarDataPoint[]): DimensionDisplayRow[] {
  const scores = radarScoresByDimensionKey(radar);
  return REPORT_RADAR_DIMENSION_ORDER.map((key) => ({
    dimensionKey: key,
    label: REPORT_DIMENSION_LABELS[key],
    score: scores[key] ?? null,
  }));
}

/**
 * Recharts radar — axis shows human labels; missing scores collapse to 0 for polygon geometry only.
 * Pair with PDF via `dimensionDisplayRowsFromRadar` (same numeric values when scores are present).
 */
export function radarChartRowsFromRadar(radar: RadarDataPoint[]): { dimension: string; score: number }[] {
  return dimensionDisplayRowsFromRadar(radar).map((row) => ({
    dimension: row.label,
    score: row.score ?? 0,
  }));
}

export function radarDimensionDisplayLabelStoredKey(storedDimension: string): string {
  const key = normalizeRadarRowToDimensionKey(storedDimension);
  return key != null ? REPORT_DIMENSION_LABELS[key] : storedDimension;
}
