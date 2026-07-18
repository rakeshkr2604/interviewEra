import { describe, expect, it } from 'vitest';
import {
  canonicalizeSkill,
  matchSkillLists,
  normalizeKey,
} from '@/lib/ats/skill-normalize';
import { buildJdMatchActionItems, formatSkillListForAction } from '@/lib/ats/jd-match';
import type { AtsJdMatch } from '@/lib/ats/types';

function baseJd(overrides: Partial<AtsJdMatch>): AtsJdMatch {
  return {
    score: 40,
    findings: [],
    requiredCoverage: 30,
    preferredCoverage: 50,
    jdRequirementCoverage: 40,
    resumeFocusAlignment: 80,
    matchedRequired: [],
    missingRequired: [],
    matchedPreferred: [],
    missingPreferred: [],
    ...overrides,
  };
}

describe('skill-normalize', () => {
  it('canonicalizes common tech aliases', () => {
    expect(canonicalizeSkill('JS')).toBe('javascript');
    expect(canonicalizeSkill('JavaScript')).toBe('javascript');
    expect(canonicalizeSkill('Node.js')).toBe('nodejs');
    expect(canonicalizeSkill('k8s')).toBe('kubernetes');
    expect(canonicalizeSkill('Postgres')).toBe('postgresql');
    expect(canonicalizeSkill('Next JS')).toBe('nextjs');
  });

  it('normalizeKey strips punctuation noise', () => {
    expect(normalizeKey('  C++  ')).toBe('c++');
    expect(normalizeKey('CI/CD')).toBe('ci/cd');
  });

  it('matchSkillLists reports coverage and gaps', () => {
    const r = matchSkillLists(
      ['TypeScript', 'React.js', 'PostgreSQL', 'Docker'],
      ['TS', 'React', 'Kubernetes', 'k8s'],
    );
    expect(r.matched).toEqual(expect.arrayContaining(['typescript', 'react']));
    expect(r.missing).toContain('kubernetes');
    // k8s and Kubernetes collapse to one missing/matched slot
    expect(r.coverage).toBeGreaterThan(0.4);
    expect(r.coverage).toBeLessThan(1);
  });

  it('empty JD skills → full coverage', () => {
    const r = matchSkillLists(['TypeScript'], []);
    expect(r.coverage).toBe(1);
    expect(r.missing).toEqual([]);
  });
});

describe('formatSkillListForAction', () => {
  it('quotes skills and caps long lists with +N more', () => {
    expect(formatSkillListForAction(['Java'])).toBe('“Java”');
    expect(formatSkillListForAction(['A', 'B', 'C', 'D'])).toBe('“A”, “B”, “C”, “D”');
    expect(formatSkillListForAction(['A', 'B', 'C', 'D', 'E', 'F'])).toBe(
      '“A”, “B”, “C”, “D”, +2 more',
    );
  });
});

describe('buildJdMatchActionItems', () => {
  it('consolidates multiple missing required skills into one HIGH item', () => {
    const missingRequired = ['Kubernetes', 'Java', 'Go', 'Scala', 'Rust', 'Elixir'];
    const items = buildJdMatchActionItems(
      baseJd({
        missingRequired,
        missingPreferred: ['GraphQL'],
        resumeFocusAlignment: 30,
        score: 40,
      }),
    );

    const high = items.filter((i) => i.priority === 'high');
    expect(high).toHaveLength(1);
    expect(high[0].text).toMatch(/6 required skills/);
    expect(high[0].text).toMatch(/Kubernetes/);
    expect(high[0].text).toMatch(/\+2 more/);
    expect(high[0].text).toMatch(/genuinely/);

    // Preferred stays separate when ≤2; focus finding stays separate
    expect(items.filter((i) => i.priority === 'low')).toHaveLength(1);
    expect(items.some((i) => /GraphQL/i.test(i.text) && /preferred/i.test(i.text))).toBe(true);
    expect(items.some((i) => /weakly related/i.test(i.text))).toBe(true);

    // Before: 6 required HIGH + 1 preferred LOW + 1 medium focus = 8
    // After: 1 HIGH + 1 LOW + 1 medium = 3
    expect(items).toHaveLength(3);
  });

  it('uses singular language for a single missing required skill', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingRequired: ['Kubernetes'],
        resumeFocusAlignment: 80,
        score: 70,
      }),
    );
    expect(items.filter((i) => i.priority === 'high')).toHaveLength(1);
    expect(items[0].text).toMatch(/required skill “Kubernetes”/);
    expect(items[0].text).not.toMatch(/required skills/);
    expect(items[0].text).toMatch(/genuinely/);
  });

  it('keeps 1–2 preferred skills as separate LOW items', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingPreferred: ['GraphQL', 'Redis'],
        resumeFocusAlignment: 80,
        score: 70,
      }),
    );
    const low = items.filter((i) => i.priority === 'low');
    expect(low).toHaveLength(2);
    expect(low.every((i) => /preferred/i.test(i.text))).toBe(true);
  });

  it('consolidates many preferred skills into one LOW item', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingPreferred: ['GraphQL', 'Redis', 'Kafka', 'Spark', 'Flink'],
        resumeFocusAlignment: 80,
        score: 70,
      }),
    );
    const low = items.filter((i) => i.priority === 'low');
    expect(low).toHaveLength(1);
    expect(low[0].text).toMatch(/5 preferred skills/);
    expect(low[0].text).toMatch(/\+1 more/);
  });

  it('does not invent required/preferred items when gaps are empty', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        score: 40,
        resumeFocusAlignment: 30,
      }),
    );
    expect(items.some((i) => /required skill/i.test(i.text))).toBe(false);
    expect(items.some((i) => /preferred/i.test(i.text))).toBe(false);
    expect(items.some((i) => /weakly related/i.test(i.text))).toBe(true);
  });
});
