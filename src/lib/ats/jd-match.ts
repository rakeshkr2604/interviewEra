/**
 * JD Match dimension — exact/normalized overlap + bidirectional semantic coverage.
 *
 * InterviewEra terminology (not Sovren/Textkernel brand names):
 * - jdRequirementCoverage: how well resume language covers JD requirements
 * - resumeFocusAlignment: how much of the resume's skill language is relevant to the JD
 */

import type { AtsJdMatch, ExtractedResumeData, Finding } from '@/lib/ats/types';
import { extractJdRequirements } from '@/lib/ats/jd-requirements';
import {
  canonicalizeSkill,
  inferSkillsFromText,
  matchSkillLists,
} from '@/lib/ats/skill-normalize';
import {
  educationRequirementPhrase,
  meetsEducationRequirement,
} from '@/lib/ats/education-match';
import {
  embedTexts,
  meanMaxCoverage,
  type EmbedUsage,
} from '@/lib/ats/embeddings';
import { JD_MATCH_WEIGHTS, reconstructJdMatchScore } from '@/lib/ats/jd-match-score';

const MAX_EMBED_ITEMS = 16;

export interface JdMatchMeta {
  jdExtractModel: string;
  embeddingModel: string;
  jdExtractUsage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  embeddingUsage?: EmbedUsage;
  degraded: boolean;
}

function resumeSkillTexts(
  extracted: ExtractedResumeData,
  extraSkills: readonly string[] = [],
): string[] {
  const fromSkills = [...extracted.skills, ...extraSkills]
    .map((s) => s.trim())
    .filter(Boolean);
  const fromExp = extracted.experience
    .map((e) => [e.title, e.company].filter(Boolean).join(' at '))
    .map((s) => s.trim())
    .filter(Boolean);
  return [...fromSkills, ...fromExp].slice(0, MAX_EMBED_ITEMS);
}

function estimateYearsFromResume(extracted: ExtractedResumeData): number | null {
  const years: number[] = [];
  for (const e of extracted.experience) {
    const start = e.startDate?.match(/\b(19|20)\d{2}\b/)?.[0];
    if (start) years.push(Number(start));
  }
  if (years.length === 0) return null;
  const earliest = Math.min(...years);
  const now = new Date().getFullYear();
  return Math.max(0, now - earliest);
}

/**
 * Fallback JD phrases when structured extraction degraded: raw JD lines /
 * sentences, so semantic comparison still measures something real instead of
 * scoring against an empty requirement list.
 */
function jdFallbackPhrases(jdText: string): string[] {
  return jdText
    .split(/[\n\r]+|(?<=[.;])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .slice(0, MAX_EMBED_ITEMS);
}

/** Neutral fallback when extraction degraded AND semantic comparison is unavailable. */
export const JD_MATCH_NEUTRAL_SCORE = 50;

/** Map canonical missing keys back to the JD's original phrasing. */
function originalPhrasing(canonicalMissing: string[], jdSkills: string[]): string[] {
  return canonicalMissing.map((canon) => {
    const hit = jdSkills.find((s) => canonicalizeSkill(s) === canon);
    return hit ?? canon;
  });
}

/**
 * Compute JD Match when a job description is present.
 */
export async function computeJdMatch(
  extracted: ExtractedResumeData,
  jdText: string,
  /** Raw resume text — enables skill inference from experience bullets etc. */
  rawResumeText?: string,
): Promise<{ jdMatch: AtsJdMatch; meta: JdMatchMeta }> {
  const findings: Finding[] = [];
  const jdExtract = await extractJdRequirements(jdText);
  const req = jdExtract.requirements;
  const degraded = jdExtract.degraded;

  // Skills evidenced in resume free text (experience bullets, projects) but
  // not listed in the skills section. Deterministic taxonomy scan — matched
  // requirements count either way; the UI/action items flag the distinction.
  const inferredSkills = rawResumeText
    ? inferSkillsFromText(rawResumeText, extracted.skills)
    : [];
  const matchingPool = [...extracted.skills, ...inferredSkills];

  if (degraded) {
    findings.push({
      id: 'jd_extract_degraded',
      severity: 'warning',
      message:
        'Could not fully validate structured requirements from this job description. The score below relies on semantic text similarity only — try pasting a cleaner JD text for a full breakdown.',
    });
  }

  const requiredOverlap = matchSkillLists(matchingPool, req.requiredSkills);
  const preferredOverlap = matchSkillLists(matchingPool, req.preferredSkills);

  // Which matches exist ONLY thanks to inferred skills? (Declared-only pass
  // misses them; pool pass catches them.)
  const declaredRequired = matchSkillLists(extracted.skills, req.requiredSkills);
  const declaredPreferred = matchSkillLists(extracted.skills, req.preferredSkills);
  const inferredOnlyMatches = [
    ...requiredOverlap.matched.filter((m) => declaredRequired.missing.includes(m)),
    ...preferredOverlap.matched.filter((m) => declaredPreferred.missing.includes(m)),
  ];

  // Degraded extraction returns empty requirement lists, for which
  // matchSkillLists defaults coverage to 1 ("nothing required, nothing
  // missing"). That default is only meaningful when extraction SUCCEEDED and
  // the JD genuinely lists no skills — on a failed extraction the exact
  // components carry zero signal and must not contribute to the score.
  const exactSignalValid = !degraded;

  // Education requirement — matched by degree LEVEL against resume education
  // entries, not by lexical skill comparison (a "Master of Computer
  // Applications" satisfies "Bachelor's or Master's in engineering or a
  // related field"). Counts as one required item in coverage.
  const eduReq = req.requiredEducation;
  const eduMatched = eduReq
    ? meetsEducationRequirement(extracted.education, eduReq.level)
    : null;
  const eduPhrase = eduReq
    ? educationRequirementPhrase(eduReq.level, eduReq.field)
    : null;

  const requiredDenom =
    requiredOverlap.matched.length +
    requiredOverlap.missing.length +
    (eduReq ? 1 : 0);
  const requiredMatchedCount =
    requiredOverlap.matched.length + (eduMatched ? 1 : 0);
  const requiredCoverageFrac =
    requiredDenom === 0
      ? requiredOverlap.coverage
      : requiredMatchedCount / requiredDenom;

  const matchedRequiredDisplay = [
    ...requiredOverlap.matched,
    ...(eduReq && eduMatched && eduPhrase ? [eduPhrase] : []),
  ];
  const missingRequiredDisplay = [
    ...(eduReq && !eduMatched && eduPhrase ? [eduPhrase] : []),
    ...originalPhrasing(requiredOverlap.missing, req.requiredSkills),
  ].slice(0, 8);
  const missingPreferredDisplay = originalPhrasing(
    preferredOverlap.missing,
    req.preferredSkills,
  ).slice(0, 8);

  const jdPhrases = degraded
    ? jdFallbackPhrases(jdText)
    : [
        ...req.requiredSkills,
        ...req.preferredSkills,
        ...(req.roleSummary ? [req.roleSummary] : []),
      ]
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, MAX_EMBED_ITEMS);

  const resumePhrases = resumeSkillTexts(extracted, inferredSkills);

  let jdRequirementCoverage = 0;
  let resumeFocusAlignment = 0;
  let embeddingUsage: EmbedUsage | undefined;
  let embeddingModel = '';
  let semanticMeasured = false;

  // Exact-overlap fallback for the semantic components — zero when degraded
  // (an empty extraction's coverage=1 default is not a real signal).
  const exactFallback = exactSignalValid ? requiredCoverageFrac : 0;

  if (jdPhrases.length === 0 && resumePhrases.length === 0) {
    findings.push({
      id: 'jd_match_thin_signals',
      severity: 'warning',
      message:
        'Not enough structured skills on either side for a strong overlap analysis. Scores lean on whatever text was available.',
    });
  } else if (jdPhrases.length === 0 || resumePhrases.length === 0) {
    jdRequirementCoverage = exactFallback;
    resumeFocusAlignment = exactFallback;
    findings.push({
      id: 'jd_match_one_sided',
      severity: 'info',
      message:
        'Semantic comparison had limited phrases on one side; exact/normalized skill overlap carries more of the score.',
    });
  } else {
    try {
      const batch = await embedTexts([...jdPhrases, ...resumePhrases]);
      embeddingUsage = batch.usage;
      embeddingModel = batch.model;
      const jdVecs = batch.vectors.slice(0, jdPhrases.length);
      const resumeVecs = batch.vectors.slice(jdPhrases.length);

      // Prefer required-skill vectors for coverage when present
      const requiredCount = Math.min(req.requiredSkills.length, jdVecs.length);
      const coverageSource =
        requiredCount > 0 ? jdVecs.slice(0, requiredCount) : jdVecs;

      jdRequirementCoverage = meanMaxCoverage(coverageSource, resumeVecs);
      resumeFocusAlignment = meanMaxCoverage(resumeVecs, jdVecs);
      semanticMeasured = true;
    } catch (err) {
      console.warn(
        '[ats-jd-match] embeddings failed — keyword overlap only',
        err instanceof Error ? err.message : err,
      );
      findings.push({
        id: 'jd_embeddings_unavailable',
        severity: 'warning',
        message:
          'Semantic similarity was unavailable for this run. Score uses exact/normalized skill overlap only.',
      });
      jdRequirementCoverage = exactFallback;
      resumeFocusAlignment = exactSignalValid
        ? preferredOverlap.coverage * 0.5 + requiredCoverageFrac * 0.5
        : 0;
    }
  }

  if (req.minYearsExperience != null) {
    const estimated = estimateYearsFromResume(extracted);
    if (estimated != null && estimated + 0.5 < req.minYearsExperience) {
      findings.push({
        id: 'years_below_stated_minimum',
        severity: 'info',
        message: `This JD mentions about ${req.minYearsExperience}+ years of experience; dated roles on the resume suggest roughly ${estimated}. This is a soft signal — many roles still hire strong builders below the posted number.`,
      });
    }
  }

  // On a degraded extraction the empty-list coverage=1 default must not be
  // displayed (or scored) as 100% required coverage.
  const requiredCoveragePct = exactSignalValid
    ? Math.round(requiredCoverageFrac * 100)
    : 0;
  const preferredCoveragePct = exactSignalValid
    ? Math.round(preferredOverlap.coverage * 100)
    : 0;
  const jdRequirementCoveragePct = Math.round(
    Math.max(0, Math.min(1, jdRequirementCoverage)) * 100,
  );
  const resumeFocusAlignmentPct = Math.round(
    Math.max(0, Math.min(1, resumeFocusAlignment)) * 100,
  );

  let { score } = reconstructJdMatchScore(
    {
      requiredCoverage: requiredCoveragePct,
      preferredCoverage: preferredCoveragePct,
      jdRequirementCoverage: jdRequirementCoveragePct,
      resumeFocusAlignment: resumeFocusAlignmentPct,
    },
    degraded ? { semanticOnly: true } : undefined,
  );

  // Degraded extraction AND no semantic measurement: nothing real was
  // compared — abstain to a neutral score instead of an extreme one
  // (degrade-don't-fail: the dimension still returns a number).
  if (degraded && !semanticMeasured) {
    score = JD_MATCH_NEUTRAL_SCORE;
    findings.push({
      id: 'jd_match_neutral_fallback',
      severity: 'warning',
      message:
        'Structured requirements and semantic comparison were both unavailable for this run, so a neutral score is shown. Re-run with a cleaner JD text for a real match analysis.',
    });
  }

  if (eduReq && eduPhrase) {
    if (eduMatched) {
      findings.push({
        id: 'education_requirement_met',
        severity: 'info',
        message: `This JD's education requirement (${eduPhrase} minimum) appears covered by your listed education.`,
      });
    } else {
      findings.push({
        id: 'education_requirement_gap',
        severity: 'warning',
        message: `This JD asks for a ${eduPhrase} minimum, and no equivalent degree was detected on your resume. If you do hold one, make sure the Education section names it clearly (e.g. "B.Tech", "MCA").`,
      });
    }
  }

  if (requiredOverlap.missing.length === 0 && req.requiredSkills.length > 0) {
    findings.push({
      id: 'required_skills_covered',
      severity: 'info',
      message:
        'Required skills from this JD appear covered by exact or normalized resume skill names.',
    });
  } else if (requiredOverlap.missing.length > 0) {
    findings.push({
      id: 'required_skill_gaps',
      severity: 'warning',
      message: `Your resume’s skill language doesn’t clearly cover ${requiredOverlap.missing.length} required item(s) from this JD (exact/normalized). Address genuine gaps — don’t keyword-stuff.`,
    });
  }

  if (
    req.requiredSkills.length === 0 &&
    req.preferredSkills.length === 0 &&
    !jdExtract.degraded
  ) {
    findings.push({
      id: 'jd_no_skills_listed',
      severity: 'info',
      message:
        'No clear skill list was found in this JD. Overlap is based mainly on the role summary and semantic text similarity.',
    });
  }

  const jdMatch: AtsJdMatch = {
    score,
    findings,
    requiredCoverage: requiredCoveragePct,
    preferredCoverage: preferredCoveragePct,
    jdRequirementCoverage: jdRequirementCoveragePct,
    resumeFocusAlignment: resumeFocusAlignmentPct,
    matchedRequired: matchedRequiredDisplay,
    missingRequired: missingRequiredDisplay,
    matchedPreferred: preferredOverlap.matched,
    missingPreferred: missingPreferredDisplay,
    requiredTotalCount: requiredDenom,
    preferredTotalCount:
      preferredOverlap.matched.length + preferredOverlap.missing.length,
    requiredMissingCount: requiredDenom - requiredMatchedCount,
    preferredMissingCount: preferredOverlap.missing.length,
    inferredFromExperience:
      inferredOnlyMatches.length > 0 ? inferredOnlyMatches : undefined,
    degraded: jdExtract.degraded || undefined,
  };

  return {
    jdMatch,
    meta: {
      jdExtractModel: jdExtract.model,
      embeddingModel: embeddingModel || 'n/a',
      jdExtractUsage: jdExtract.usage,
      embeddingUsage,
      degraded: jdExtract.degraded,
    },
  };
}

/** Programmatic JD gap action items — not free-form LLM advice. */
const SKILL_LIST_VISIBLE_CAP = 4;

/** Quote skills for prose; cap long lists with “+N more”. */
export function formatSkillListForAction(skills: string[], visibleCap = SKILL_LIST_VISIBLE_CAP): string {
  if (skills.length === 0) return '';
  const shown = skills.slice(0, visibleCap);
  const extra = skills.length - shown.length;
  const body = shown.map((s) => `“${s}”`).join(', ');
  return extra > 0 ? `${body}, +${extra} more` : body;
}

/**
 * Approximate score points recoverable by fixing `itemCount` missing items
 * out of `totalCount` contributing to a weighted component (required=45,
 * preferred=15). Display-only — mirrors reconstructJdMatchScore's formula,
 * never feeds back into it. Null when there's nothing to attribute weight to
 * (e.g. degraded extraction, where these components already score 0).
 */
function pointsRecoverable(
  weight: number,
  totalCount: number,
  itemCount: number,
): number | undefined {
  if (!(totalCount > 0) || !(itemCount > 0)) return undefined;
  return Math.round((weight / totalCount) * itemCount);
}

export function buildJdMatchActionItems(jdMatch: AtsJdMatch): Array<{
  priority: 'high' | 'medium' | 'low';
  text: string;
  expectedImpact: string;
  pointsEstimate?: number;
}> {
  const items: Array<{
    priority: 'high' | 'medium' | 'low';
    text: string;
    expectedImpact: string;
    pointsEstimate?: number;
  }> = [];

  const missingRequired = jdMatch.missingRequired;
  if (missingRequired.length === 1) {
    items.push({
      priority: 'high',
      text: `Your resume doesn’t clearly cover the required skill ${formatSkillListForAction(missingRequired)} from this JD. Add it only if you genuinely have that experience (with a concrete project or role bullet) — don’t paste keywords you can’t defend.`,
      expectedImpact:
        'Improves language overlap with a skill this posting treats as required.',
      pointsEstimate: pointsRecoverable(
        JD_MATCH_WEIGHTS.requiredExact,
        jdMatch.requiredTotalCount,
        jdMatch.requiredMissingCount,
      ),
    });
  } else if (missingRequired.length > 1) {
    items.push({
      priority: 'high',
      text: `Your resume doesn’t clearly cover ${missingRequired.length} required skills from this JD: ${formatSkillListForAction(missingRequired)}. Add any you genuinely have experience with — cite a concrete project or role bullet, don’t paste keywords you can’t defend.`,
      expectedImpact:
        'Improves language overlap with skills this posting treats as required.',
      pointsEstimate: pointsRecoverable(
        JD_MATCH_WEIGHTS.requiredExact,
        jdMatch.requiredTotalCount,
        jdMatch.requiredMissingCount,
      ),
    });
  }

  const missingPreferred = jdMatch.missingPreferred;
  if (missingPreferred.length > 0 && missingPreferred.length <= 2) {
    for (const skill of missingPreferred) {
      items.push({
        priority: 'low',
        text: `“${skill}” appears as a preferred (not required) skill in this JD. Include it if you have real exposure.`,
        expectedImpact: 'Small boost to preferred-skill overlap with this posting.',
        pointsEstimate: pointsRecoverable(
          JD_MATCH_WEIGHTS.preferredExact,
          jdMatch.preferredTotalCount,
          1,
        ),
      });
    }
  } else if (missingPreferred.length > 2) {
    items.push({
      priority: 'low',
      text: `${missingPreferred.length} preferred skills from this JD aren’t clearly on your resume: ${formatSkillListForAction(missingPreferred)}. Include any you have real exposure to.`,
      expectedImpact: 'Small boost to preferred-skill overlap with this posting.',
      pointsEstimate: pointsRecoverable(
        JD_MATCH_WEIGHTS.preferredExact,
        jdMatch.preferredTotalCount,
        jdMatch.preferredMissingCount,
      ),
    });
  }

  const inferredOnly = jdMatch.inferredFromExperience ?? [];
  for (const skill of inferredOnly.slice(0, 3)) {
    items.push({
      priority: 'low',
      text: `Add “${skill}” to your skills list — we found it in your experience but recruiters’ ATS systems may only scan your skills section.`,
      expectedImpact:
        'Makes an already-evidenced skill visible to skills-section-only ATS scans.',
    });
  }
  if (inferredOnly.length > 3) {
    items.push({
      priority: 'low',
      text: `${inferredOnly.length - 3} more skills appear in your experience but not in your skills list: ${formatSkillListForAction(inferredOnly.slice(3))}. Add the ones you want recruiters to see at a glance.`,
      expectedImpact:
        'Makes already-evidenced skills visible to skills-section-only ATS scans.',
    });
  }

  if (jdMatch.resumeFocusAlignment < 45 && jdMatch.score < 60) {
    items.push({
      priority: 'medium',
      text: 'Much of your resume’s skill language looks weakly related to this JD. Consider a tailored version that leads with overlapping tools and domain work — or apply to roles closer to your strengths.',
      expectedImpact: 'Improves resume↔JD focus alignment for this specific posting.',
    });
  }

  return items;
}
