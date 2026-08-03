import { describe, expect, it } from 'vitest';
import { reconstructJdMatchScore } from '@/lib/ats/jd-match-score';

describe('reconstructJdMatchScore', () => {
  it('explains the 90 vs 78 gap at 100% required coverage (Phase 2 follow-up)', () => {
    // Case (a)-shaped: strong preferred + strong semantic
    const a = reconstructJdMatchScore({
      requiredCoverage: 100,
      preferredCoverage: 75,
      jdRequirementCoverage: 96,
      resumeFocusAlignment: 65,
    });
    // Case (c)-shaped: same required, weaker preferred + semantic
    const c = reconstructJdMatchScore({
      requiredCoverage: 100,
      preferredCoverage: 33,
      jdRequirementCoverage: 78,
      resumeFocusAlignment: 57,
    });

    expect(a.score).toBe(90);
    expect(c.score).toBe(78);

    // Gap must be attributable to non-required components
    const preferredDelta =
      a.contributions.preferredExact - c.contributions.preferredExact;
    const semanticDelta =
      a.contributions.jdRequirementSemantic +
      a.contributions.resumeFocusSemantic -
      (c.contributions.jdRequirementSemantic + c.contributions.resumeFocusSemantic);

    expect(a.contributions.requiredExact).toBe(c.contributions.requiredExact);
    expect(preferredDelta).toBeGreaterThan(5); // ~6.3 pts from preferred
    expect(semanticDelta).toBeGreaterThan(4); // ~5.7 pts from semantic pair
    expect(a.score - c.score).toBe(12);
  });

  it('semantic-only mode zeroes exact components and renormalizes weights', () => {
    const b = reconstructJdMatchScore(
      {
        requiredCoverage: 100, // must be ignored
        preferredCoverage: 100, // must be ignored
        jdRequirementCoverage: 60,
        resumeFocusAlignment: 60,
      },
      { semanticOnly: true },
    );
    expect(b.score).toBe(60); // 0.6×62.5 + 0.6×37.5
    expect(b.contributions.requiredExact).toBe(0);
    expect(b.contributions.preferredExact).toBe(0);
    expect(b.formula).toMatch(/semantic-only/);

    // Full semantic coverage in semantic-only mode reaches 100 — the mode
    // renormalizes rather than capping.
    const full = reconstructJdMatchScore(
      {
        requiredCoverage: 0,
        preferredCoverage: 0,
        jdRequirementCoverage: 100,
        resumeFocusAlignment: 100,
      },
      { semanticOnly: true },
    );
    expect(full.score).toBe(100);
  });

  it('is deterministic and clamps', () => {
    const over = reconstructJdMatchScore({
      requiredCoverage: 120,
      preferredCoverage: -10,
      jdRequirementCoverage: 100,
      resumeFocusAlignment: 100,
    });
    expect(over.score).toBeLessThanOrEqual(100);
    expect(over.score).toBeGreaterThanOrEqual(0);
  });
});
