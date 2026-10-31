import { describe, expect, it } from 'vitest';
import { buildPointsJourney } from './points-journey';

describe('buildPointsJourney', () => {
  it('returns an empty series for no rows', () => {
    expect(buildPointsJourney([])).toEqual([]);
  });

  it('accumulates xp_gained in chronological order regardless of input order', () => {
    const rows = [
      { completed_at: '2026-10-20T10:00:00.000Z', unlock_contribution: { xp_gained: 50 } },
      { completed_at: '2026-10-05T10:00:00.000Z', unlock_contribution: { xp_gained: 72 } },
      { completed_at: '2026-10-12T10:00:00.000Z', unlock_contribution: { xp_gained: 0 } },
    ];
    const result = buildPointsJourney(rows);
    expect(result.map((p) => p.cumulativeXp)).toEqual([72, 72, 122]);
  });

  it('treats missing/non-numeric xp_gained as zero contribution', () => {
    const rows = [
      { completed_at: '2026-10-01T10:00:00.000Z', unlock_contribution: {} },
      { completed_at: '2026-10-02T10:00:00.000Z', unlock_contribution: { xp_gained: 'bad' } },
      { completed_at: '2026-10-03T10:00:00.000Z', unlock_contribution: { xp_gained: 40 } },
    ];
    const result = buildPointsJourney(rows);
    expect(result.map((p) => p.cumulativeXp)).toEqual([0, 0, 40]);
  });

  it('never produces a negative cumulative value from a negative xp_gained', () => {
    const rows = [
      { completed_at: '2026-10-01T10:00:00.000Z', unlock_contribution: { xp_gained: -5 } },
    ];
    expect(buildPointsJourney(rows)[0].cumulativeXp).toBe(0);
  });

  it('handles null unlock_contribution gracefully', () => {
    const rows = [{ completed_at: '2026-10-01T10:00:00.000Z', unlock_contribution: null }];
    expect(buildPointsJourney(rows)[0].cumulativeXp).toBe(0);
  });
});
