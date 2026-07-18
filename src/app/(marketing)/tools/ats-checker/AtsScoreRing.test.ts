import { describe, expect, it } from 'vitest';
import { scoreBand } from './AtsScoreRing';

describe('scoreBand (results card accents)', () => {
  it('maps Strong / Needs work / At risk to distinct landing status tokens', () => {
    expect(scoreBand(100).label).toBe('Strong');
    expect(scoreBand(100).color).toBe('var(--accent-success)');
    expect(scoreBand(75).color).toBe('var(--accent-success)');

    expect(scoreBand(74).label).toBe('Needs work');
    expect(scoreBand(50).color).toBe('var(--accent-warning)');

    expect(scoreBand(49).label).toBe('At risk');
    expect(scoreBand(0).color).toBe('var(--accent-danger)');
  });

  it('keeps surface mixes subtle (8%) so text stays on card-bg family', () => {
    for (const s of [40, 60, 90]) {
      expect(scoreBand(s).surface).toContain('8%');
      expect(scoreBand(s).surface).toContain('var(--card-bg)');
    }
  });
});
