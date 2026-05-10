import { describe, expect, it } from 'vitest';
import type { RadarDataPoint } from '@/types/app.types';
import {
  dimensionDisplayRowsFromRadar,
  radarChartRowsFromRadar,
} from '@/lib/utils/report-radar-dimensions';

describe('report radar dimensions', () => {
  const keyedRadar: RadarDataPoint[] = [
    { dimension: 'communication_clarity', score: 7.1 },
    { dimension: 'technical_depth', score: 6.2 },
    { dimension: 'answer_structure', score: 7.5 },
    { dimension: 'confidence', score: 6.0 },
    { dimension: 'relevance', score: 7.8 },
  ];

  it('PDF rows and web chart rows expose identical scores for keyed radar_data (labels align)', () => {
    const pdf = dimensionDisplayRowsFromRadar(keyedRadar);
    const web = radarChartRowsFromRadar(keyedRadar);

    expect(pdf.map((r) => r.label)).toEqual(web.map((r) => r.dimension));
    expect(pdf.map((r) => r.score)).toEqual(web.map((r) => r.score));
    expect(pdf.every((r) => r.score != null)).toBe(true);
  });

  it('maps legacy short labels to the same scores as keyed storage', () => {
    const legacy: RadarDataPoint[] = [
      { dimension: 'Communication', score: 7.1 },
      { dimension: 'Technical', score: 6.2 },
      { dimension: 'Structure', score: 7.5 },
      { dimension: 'Confidence', score: 6.0 },
      { dimension: 'Relevance', score: 7.8 },
    ];

    expect(dimensionDisplayRowsFromRadar(legacy).map((r) => r.score)).toEqual(
      dimensionDisplayRowsFromRadar(keyedRadar).map((r) => r.score),
    );
  });

  it('maps legacy long labels (previously used in mismatched PDF lookup)', () => {
    const legacyLong: RadarDataPoint[] = [
      { dimension: 'Communication Clarity', score: 7.7 },
      { dimension: 'Technical Depth', score: 6.4 },
      { dimension: 'Answer Structure', score: 8.1 },
      { dimension: 'Confidence', score: 6.5 },
      { dimension: 'Relevance', score: 7.6 },
    ];
    const rows = dimensionDisplayRowsFromRadar(legacyLong);
    expect(rows.find((r) => r.dimensionKey === 'communication_clarity')?.score).toBe(7.7);
    expect(rows.every((r) => r.score != null)).toBe(true);
  });

  it('returns null scores for spider dimensions missing from radar_data', () => {
    const partial: RadarDataPoint[] = [{ dimension: 'confidence', score: 5 }];
    const rows = dimensionDisplayRowsFromRadar(partial);
    expect(rows.find((r) => r.dimensionKey === 'confidence')?.score).toBe(5);
    expect(rows.find((r) => r.dimensionKey === 'relevance')?.score).toBeNull();
  });
});
