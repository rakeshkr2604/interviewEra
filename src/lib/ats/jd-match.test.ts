/**
 * computeJdMatch — degraded-extraction scoring behavior (Bug B regression).
 *
 * Reproduces the production symptom: JD extraction degrades (empty requirement
 * lists), and the old code scored 100/100 via the empty-list coverage=1 default
 * while simultaneously showing "None matched yet" + a degraded warning.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExtractedResumeData } from '@/lib/ats/types';

vi.mock('@/lib/ats/jd-requirements', () => ({
  extractJdRequirements: vi.fn(),
}));
vi.mock('@/lib/ats/embeddings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ats/embeddings')>();
  return { ...actual, embedTexts: vi.fn() };
});

import {
  buildJdMatchActionItems,
  computeJdMatch,
  JD_MATCH_NEUTRAL_SCORE,
} from '@/lib/ats/jd-match';
import { extractJdRequirements } from '@/lib/ats/jd-requirements';
import { embedTexts } from '@/lib/ats/embeddings';

const mockExtract = vi.mocked(extractJdRequirements);
const mockEmbed = vi.mocked(embedTexts);

const RESUME_SKILLS = ['TypeScript', 'Python', 'SQL'];

const resume: ExtractedResumeData = {
  name: 'Ritu Gupta',
  email: null,
  phone: null,
  linkedin: null,
  location: null,
  experience: [{ company: 'Acme', title: 'Analyst', startDate: '2022', endDate: null }],
  education: [{ institution: 'DU', degree: 'B.Com', year: '2021' }],
  skills: RESUME_SKILLS,
};

const JD_TEXT = [
  'We are hiring a Software Engineer for our Bengaluru office.',
  'You will build and maintain backend services at scale.',
  'Strong problem-solving skills are expected of every candidate.',
].join('\n');

const DEGRADED = {
  requirements: {
    requiredSkills: [],
    preferredSkills: [],
    requiredEducation: null,
    minYearsExperience: null,
    roleSummary: null,
  },
  degraded: true,
  model: 'test-model',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('computeJdMatch — degraded JD extraction (Bug B)', () => {
  it('never scores 100 from an empty degraded extraction; uses semantic-only score', async () => {
    mockExtract.mockResolvedValue(DEGRADED);
    // JD phrases embed to [1,0]; resume phrases to [0.6,0.8] → cosine 0.6 both ways
    const resumePhrases = new Set([...RESUME_SKILLS, 'Analyst at Acme']);
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map((t) => (resumePhrases.has(t) ? [0.6, 0.8] : [1, 0])),
      model: 'mock-embed',
    }));

    const { jdMatch } = await computeJdMatch(resume, JD_TEXT);

    // semantic-only: 0.6×62.5 + 0.6×37.5 = 60
    expect(jdMatch.score).toBe(60);
    expect(jdMatch.score).not.toBe(100);
    expect(jdMatch.requiredCoverage).toBe(0); // not the fake 100
    expect(jdMatch.preferredCoverage).toBe(0);
    expect(jdMatch.matchedRequired).toEqual([]);
    expect(jdMatch.degraded).toBe(true);
    expect(jdMatch.findings.some((f) => f.id === 'jd_extract_degraded')).toBe(true);
  });

  it('abstains to a neutral score when embeddings are also unavailable', async () => {
    mockExtract.mockResolvedValue(DEGRADED);
    mockEmbed.mockRejectedValue(new Error('embeddings down'));

    const { jdMatch } = await computeJdMatch(resume, JD_TEXT);

    expect(jdMatch.score).toBe(JD_MATCH_NEUTRAL_SCORE);
    expect(jdMatch.requiredCoverage).toBe(0);
    expect(jdMatch.findings.some((f) => f.id === 'jd_match_neutral_fallback')).toBe(true);
    expect(jdMatch.findings.some((f) => f.id === 'jd_extract_degraded')).toBe(true);
  });

  it('keeps the coverage=1 default for a SUCCESSFUL extraction with no listed skills', async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        requiredSkills: [],
        preferredSkills: [],
        requiredEducation: null,
        minYearsExperience: null,
        roleSummary: 'General software role',
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    const { jdMatch } = await computeJdMatch(resume, JD_TEXT);

    // Genuine no-skills JD: exact components legitimately count as covered.
    expect(jdMatch.requiredCoverage).toBe(100);
    expect(jdMatch.degraded).toBeUndefined();
    expect(jdMatch.findings.some((f) => f.id === 'jd_no_skills_listed')).toBe(true);
  });

  it('scores non-degraded overlap normally (Rakesh-style skills baseline)', async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        requiredSkills: ['TypeScript', 'Python'],
        preferredSkills: [],
        requiredEducation: null,
        minYearsExperience: null,
        roleSummary: null,
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    const { jdMatch } = await computeJdMatch(resume, JD_TEXT);

    expect(jdMatch.requiredCoverage).toBe(100);
    expect(jdMatch.matchedRequired).toEqual(
      expect.arrayContaining(['typescript', 'python']),
    );
    expect(jdMatch.score).toBe(100);
  });
});

describe('computeJdMatch — education + umbrella requirements (Bug A / Symptom 1)', () => {
  const rakesh: ExtractedResumeData = {
    ...resume,
    name: 'Rakesh Kumar',
    education: [{ institution: 'IGNOU', degree: 'Master of Computer Applications', year: '2024' }],
    skills: ['TypeScript', 'Python', 'SQL'],
  };

  it("MCA + Python/SQL now satisfy \"Bachelor's or Master's\" + \"one coding language\"", async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        // Post-fix extraction contract: atomic skills + umbrella category,
        // education routed to requiredEducation instead of requiredSkills.
        requiredSkills: ['programming', 'SQL'],
        preferredSkills: [],
        requiredEducation: { level: 'bachelor' as const, field: 'engineering' },
        minYearsExperience: null,
        roleSummary: null,
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    const { jdMatch } = await computeJdMatch(rakesh, JD_TEXT);

    // Was: requiredCoverage 0/100, everything MISSING REQUIRED
    expect(jdMatch.requiredCoverage).toBe(100);
    expect(jdMatch.matchedRequired).toEqual(
      expect.arrayContaining(['programming', 'sql', "bachelor's degree (engineering)"]),
    );
    expect(jdMatch.missingRequired).toEqual([]);
    expect(jdMatch.findings.some((f) => f.id === 'education_requirement_met')).toBe(true);
    expect(jdMatch.score).toBe(100);
    // Change 2: counts flow end-to-end for point-value display (3 required
    // items total: programming, SQL, education — all matched).
    expect(jdMatch.requiredTotalCount).toBe(3);
    expect(jdMatch.requiredMissingCount).toBe(0);
  });

  it('flags a genuine education gap as missing required', async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        requiredSkills: ['SQL'],
        preferredSkills: [],
        requiredEducation: { level: 'master' as const, field: null },
        minYearsExperience: null,
        roleSummary: null,
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    const btechOnly: ExtractedResumeData = {
      ...rakesh,
      education: [{ institution: 'X', degree: 'B.Tech CSE', year: '2023' }],
    };
    const { jdMatch } = await computeJdMatch(btechOnly, JD_TEXT);

    expect(jdMatch.requiredCoverage).toBe(50); // SQL matched, master's missing
    expect(jdMatch.missingRequired).toContain("master's degree");
    expect(jdMatch.findings.some((f) => f.id === 'education_requirement_gap')).toBe(true);
    expect(jdMatch.requiredTotalCount).toBe(2); // SQL + education
    expect(jdMatch.requiredMissingCount).toBe(1); // education only
  });
});

describe('computeJdMatch — skills inferred from experience text (Change 1)', () => {
  const ritu: ExtractedResumeData = {
    name: 'Ritu Gupta',
    email: null,
    phone: null,
    linkedin: null,
    location: null,
    experience: [
      {
        company: 'Amazon',
        title: 'SDE II',
        startDate: '2021',
        endDate: null,
      },
    ],
    education: [{ institution: 'DTU', degree: 'B.Tech CSE', year: '2020' }],
    // "integration testing" deliberately NOT listed here — only in the bullet below.
    skills: ['Java', 'AWS'],
  };

  const RITU_RAW_TEXT =
    'Ritu Gupta\nAmazon — SDE II\n' +
    'Developed integration tests and regression suites for the checkout service, ' +
    'reducing production incidents by 30%.\nSkills: Java, AWS';

  it('matches "integration testing" via experience-bullet text instead of flagging it missing', async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        requiredSkills: ['Java', 'integration testing'],
        preferredSkills: [],
        requiredEducation: null,
        minYearsExperience: null,
        roleSummary: null,
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    // Before the fix (no rawResumeText passed): "integration testing" is MISSING.
    const before = await computeJdMatch(ritu, JD_TEXT);
    expect(before.jdMatch.missingRequired).toContain('integration testing');
    expect(before.jdMatch.requiredCoverage).toBe(50);

    // After the fix: raw text is scanned, the requirement matches.
    const after = await computeJdMatch(ritu, JD_TEXT, RITU_RAW_TEXT);
    expect(after.jdMatch.missingRequired).not.toContain('integration testing');
    expect(after.jdMatch.matchedRequired).toContain('integration testing');
    expect(after.jdMatch.requiredCoverage).toBe(100);
    expect(after.jdMatch.inferredFromExperience).toContain('integration testing');
    expect(after.jdMatch.requiredMissingCount).toBe(0);

    // Change 2: with nothing missing, buildJdMatchActionItems produces no
    // points-bearing HIGH card for required skills (there's nothing to fix).
    const afterItems = buildJdMatchActionItems(after.jdMatch);
    expect(afterItems.some((i) => i.priority === 'high')).toBe(false);
    const beforeItems = buildJdMatchActionItems(before.jdMatch);
    const beforeHigh = beforeItems.find((i) => i.priority === 'high')!;
    expect(beforeHigh.pointsEstimate).toBeGreaterThan(0);
  });

  it('does not flag a skill as inferred-only when it is also declared', async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        requiredSkills: ['Java'],
        preferredSkills: [],
        requiredEducation: null,
        minYearsExperience: null,
        roleSummary: null,
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    const { jdMatch } = await computeJdMatch(ritu, JD_TEXT, RITU_RAW_TEXT);
    expect(jdMatch.inferredFromExperience ?? []).not.toContain('java');
  });

  it('adds a LOW-priority action item when a requirement is matched only via inferred experience', async () => {
    mockExtract.mockResolvedValue({
      requirements: {
        requiredSkills: ['integration testing'],
        preferredSkills: [],
        requiredEducation: null,
        minYearsExperience: null,
        roleSummary: null,
      },
      degraded: false,
      model: 'test-model',
    });
    mockEmbed.mockImplementation(async (texts) => ({
      vectors: texts.map(() => [1, 0]),
      model: 'mock-embed',
    }));

    const { jdMatch } = await computeJdMatch(ritu, JD_TEXT, RITU_RAW_TEXT);
    const items = buildJdMatchActionItems(jdMatch);
    const lowItem = items.find(
      (i) => i.priority === 'low' && /integration testing/i.test(i.text),
    );
    expect(lowItem).toBeDefined();
    expect(lowItem!.text).toMatch(/Add .*integration testing.* to your skills list/i);
    expect(lowItem!.text).toMatch(/recruiters.*ATS systems may only scan your skills section/i);
  });
});
