/**
 * JD Match dimension — exact/normalized overlap + bidirectional semantic coverage.
 *
 * InterviewEra terminology (not Sovren/Textkernel brand names):
 * - jdRequirementCoverage: how well resume language covers JD requirements
 * - resumeFocusAlignment: how much of the resume's skill language is relevant to the JD
 */

import type { AtsJdMatch, ExtractedResumeData, Finding } from '@/lib/ats/types';
import { extractJdRequirements } from '@/lib/ats/jd-requirements';
import { canonicalizeSkill, matchSkillLists } from '@/lib/ats/skill-normalize';
import {
  embedTexts,
  meanMaxCoverage,
  type EmbedUsage,
} from '@/lib/ats/embeddings';
import { reconstructJdMatchScore } from '@/lib/ats/jd-match-score';

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

function resumeSkillTexts(extracted: ExtractedResumeData): string[] {
  const fromSkills = extracted.skills.map((s) => s.trim()).filter(Boolean);
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
): Promise<{ jdMatch: AtsJdMatch; meta: JdMatchMeta }> {
  const findings: Finding[] = [];
  const jdExtract = await extractJdRequirements(jdText);
  const req = jdExtract.requirements;

  if (jdExtract.degraded) {
    findings.push({
      id: 'jd_extract_degraded',
      severity: 'warning',
      message:
        'Could not fully validate structured requirements from this job description. Overlap scores may be incomplete — try pasting a cleaner JD text.',
    });
  }

  const requiredOverlap = matchSkillLists(extracted.skills, req.requiredSkills);
  const preferredOverlap = matchSkillLists(extracted.skills, req.preferredSkills);

  const missingRequiredDisplay = originalPhrasing(
    requiredOverlap.missing,
    req.requiredSkills,
  ).slice(0, 8);
  const missingPreferredDisplay = originalPhrasing(
    preferredOverlap.missing,
    req.preferredSkills,
  ).slice(0, 8);

  const jdPhrases = [
    ...req.requiredSkills,
    ...req.preferredSkills,
    ...(req.roleSummary ? [req.roleSummary] : []),
  ]
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_EMBED_ITEMS);

  const resumePhrases = resumeSkillTexts(extracted);

  let jdRequirementCoverage = 0;
  let resumeFocusAlignment = 0;
  let embeddingUsage: EmbedUsage | undefined;
  let embeddingModel = '';

  if (jdPhrases.length === 0 && resumePhrases.length === 0) {
    findings.push({
      id: 'jd_match_thin_signals',
      severity: 'warning',
      message:
        'Not enough structured skills on either side for a strong overlap analysis. Scores lean on whatever text was available.',
    });
  } else if (jdPhrases.length === 0 || resumePhrases.length === 0) {
    jdRequirementCoverage = requiredOverlap.coverage;
    resumeFocusAlignment = requiredOverlap.coverage;
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
      jdRequirementCoverage = requiredOverlap.coverage;
      resumeFocusAlignment =
        preferredOverlap.coverage * 0.5 + requiredOverlap.coverage * 0.5;
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

  const requiredCoveragePct = Math.round(requiredOverlap.coverage * 100);
  const preferredCoveragePct = Math.round(preferredOverlap.coverage * 100);
  const jdRequirementCoveragePct = Math.round(
    Math.max(0, Math.min(1, jdRequirementCoverage)) * 100,
  );
  const resumeFocusAlignmentPct = Math.round(
    Math.max(0, Math.min(1, resumeFocusAlignment)) * 100,
  );

  const { score } = reconstructJdMatchScore({
    requiredCoverage: requiredCoveragePct,
    preferredCoverage: preferredCoveragePct,
    jdRequirementCoverage: jdRequirementCoveragePct,
    resumeFocusAlignment: resumeFocusAlignmentPct,
  });

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
    matchedRequired: requiredOverlap.matched,
    missingRequired: missingRequiredDisplay,
    matchedPreferred: preferredOverlap.matched,
    missingPreferred: missingPreferredDisplay,
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

export function buildJdMatchActionItems(jdMatch: AtsJdMatch): Array<{
  priority: 'high' | 'medium' | 'low';
  text: string;
  expectedImpact: string;
}> {
  const items: Array<{
    priority: 'high' | 'medium' | 'low';
    text: string;
    expectedImpact: string;
  }> = [];

  const missingRequired = jdMatch.missingRequired;
  if (missingRequired.length === 1) {
    items.push({
      priority: 'high',
      text: `Your resume doesn’t clearly cover the required skill ${formatSkillListForAction(missingRequired)} from this JD. Add it only if you genuinely have that experience (with a concrete project or role bullet) — don’t paste keywords you can’t defend.`,
      expectedImpact:
        'Improves language overlap with a skill this posting treats as required.',
    });
  } else if (missingRequired.length > 1) {
    items.push({
      priority: 'high',
      text: `Your resume doesn’t clearly cover ${missingRequired.length} required skills from this JD: ${formatSkillListForAction(missingRequired)}. Add any you genuinely have experience with — cite a concrete project or role bullet, don’t paste keywords you can’t defend.`,
      expectedImpact:
        'Improves language overlap with skills this posting treats as required.',
    });
  }

  const missingPreferred = jdMatch.missingPreferred;
  if (missingPreferred.length > 0 && missingPreferred.length <= 2) {
    for (const skill of missingPreferred) {
      items.push({
        priority: 'low',
        text: `“${skill}” appears as a preferred (not required) skill in this JD. Include it if you have real exposure.`,
        expectedImpact: 'Small boost to preferred-skill overlap with this posting.',
      });
    }
  } else if (missingPreferred.length > 2) {
    items.push({
      priority: 'low',
      text: `${missingPreferred.length} preferred skills from this JD aren’t clearly on your resume: ${formatSkillListForAction(missingPreferred)}. Include any you have real exposure to.`,
      expectedImpact: 'Small boost to preferred-skill overlap with this posting.',
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
