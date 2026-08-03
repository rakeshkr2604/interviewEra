import { describe, expect, it } from 'vitest';
import {
  canonicalizeSkill,
  inferSkillsFromText,
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
    requiredTotalCount: 0,
    preferredTotalCount: 0,
    requiredMissingCount: 0,
    preferredMissingCount: 0,
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

  it('empty JD skills → full coverage, flagged as empty so callers can abstain', () => {
    const r = matchSkillLists(['TypeScript'], []);
    expect(r.coverage).toBe(1);
    expect(r.missing).toEqual([]);
    expect(r.isEmpty).toBe(true);
  });

  it('non-empty JD skills are not flagged empty', () => {
    const r = matchSkillLists(['TypeScript'], ['TS']);
    expect(r.isEmpty).toBe(false);
  });

  it('umbrella categories satisfied by concrete member skills (Symptom 1 regression)', () => {
    const r = matchSkillLists(
      ['TypeScript', 'Python', 'SQL'],
      ['programming', 'databases'],
    );
    expect(r.matched).toEqual(expect.arrayContaining(['programming', 'databases']));
    expect(r.missing).toEqual([]);
    expect(r.coverage).toBe(1);
  });

  it('umbrella aliases canonicalize ("coding language" → programming)', () => {
    const r = matchSkillLists(['Java'], ['coding language']);
    expect(r.matched).toContain('programming');
  });

  it('umbrella category with no member on the resume stays missing', () => {
    const r = matchSkillLists(['Photoshop'], ['programming']);
    expect(r.missing).toContain('programming');
  });
});

describe('inferSkillsFromText', () => {
  it('finds a skill mentioned only in an experience bullet (Ritu Gupta / Amazon regression)', () => {
    const bullet = 'Developed integration tests and regression suites for the checkout service at Amazon.';
    const found = inferSkillsFromText(bullet, ['Java', 'AWS']);
    expect(found).toContain('integration testing');
  });

  it('excludes skills already in the declared list', () => {
    const bullet = 'Wrote Python scripts for data pipelines.';
    const found = inferSkillsFromText(bullet, ['Python']);
    expect(found).not.toContain('python');
  });

  it('is whole-word: "javascript" text does not spuriously match unrelated short aliases', () => {
    const found = inferSkillsFromText('We migrated the goldfish tank at the office.', []);
    expect(found).not.toContain('golang'); // "go" excluded from text-scan as ambiguous
  });

  it('normalizes multi-word aliases with punctuation ("Node.js" mention)', () => {
    const found = inferSkillsFromText('Built REST services with Node.js and PostgreSQL.', []);
    expect(found).toEqual(expect.arrayContaining(['nodejs', 'postgresql']));
  });

  it('deduplicates repeated mentions', () => {
    const found = inferSkillsFromText('Python, Python, Python everywhere.', []);
    expect(found.filter((s) => s === 'python')).toHaveLength(1);
  });

  it('empty text returns empty list', () => {
    expect(inferSkillsFromText('', [])).toEqual([]);
    expect(inferSkillsFromText('   ', ['Java'])).toEqual([]);
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

describe('buildJdMatchActionItems — pointsEstimate (Change 2)', () => {
  it('computes ~(45 / total_required) points for a single missing required item', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingRequired: ['Kubernetes'],
        requiredTotalCount: 5,
        requiredMissingCount: 1,
      }),
    );
    const high = items.find((i) => i.priority === 'high')!;
    // 45 / 5 = 9
    expect(high.pointsEstimate).toBe(9);
    expect(high.text).toMatch(/Kubernetes/);
  });

  it('sums points across a consolidated multi-item required card (additive, not per-card-flat)', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingRequired: ['Kubernetes', 'Java'],
        requiredTotalCount: 8,
        requiredMissingCount: 2,
      }),
    );
    const high = items.find((i) => i.priority === 'high')!;
    // 45/8 per item * 2 items = 11.25 -> rounds to 11
    expect(high.pointsEstimate).toBe(11);
  });

  it('uses requiredMissingCount (not the display-truncated missingRequired[] length) for the total', () => {
    const missingRequired = Array.from({ length: 8 }, (_, i) => `skill-${i}`); // display-capped at 8
    const items = buildJdMatchActionItems(
      baseJd({
        missingRequired,
        requiredTotalCount: 12,
        requiredMissingCount: 10, // real count exceeds the 8 displayed
      }),
    );
    const high = items.find((i) => i.priority === 'high')!;
    // 45/12 * 10 = 37.5 -> 38, not 45/12*8=30
    expect(high.pointsEstimate).toBe(38);
  });

  it('computes preferred points at the 15-point weight, one item per card when ≤2 missing', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingPreferred: ['GraphQL', 'Redis'],
        preferredTotalCount: 6,
        preferredMissingCount: 2,
      }),
    );
    const low = items.filter((i) => i.priority === 'low');
    // Each individual preferred card values ONE item: 15/6 = 2.5 -> 3 (rounds to nearest)
    expect(low.every((i) => i.pointsEstimate === 3)).toBe(true);
  });

  it('consolidated preferred card sums all missing items', () => {
    const missingPreferred = ['GraphQL', 'Redis', 'Kafka', 'Spark', 'Flink'];
    const items = buildJdMatchActionItems(
      baseJd({
        missingPreferred,
        preferredTotalCount: 10,
        preferredMissingCount: 5,
      }),
    );
    const low = items.find((i) => i.priority === 'low' && /5 preferred skills/.test(i.text))!;
    // 15/10 * 5 = 7.5 -> 8
    expect(low.pointsEstimate).toBe(8);
  });

  it('omits pointsEstimate when there is nothing to attribute weight to (zero total count)', () => {
    const items = buildJdMatchActionItems(
      baseJd({
        missingRequired: ['Kubernetes'],
        requiredTotalCount: 0,
        requiredMissingCount: 0,
      }),
    );
    const high = items.find((i) => i.priority === 'high')!;
    expect(high.pointsEstimate).toBeUndefined();
  });

  it('never changes the underlying score — pointsEstimate is a display-only derivation', () => {
    const jd = baseJd({
      score: 40,
      missingRequired: ['Kubernetes'],
      requiredTotalCount: 5,
      requiredMissingCount: 1,
    });
    buildJdMatchActionItems(jd);
    expect(jd.score).toBe(40); // untouched by computing action items
  });
});
