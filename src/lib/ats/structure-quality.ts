/**
 * Structure Quality — deterministic checks over extracted JSON + raw word count.
 */

import type { ExtractedResumeData, Finding } from '@/lib/ats/types';

export interface StructureQualityResult {
  score: number;
  findings: Finding[];
}

function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}

/** Parse a coarse year from free-form date strings for reverse-chrono checks. */
export function parseYearHint(value: string | null | undefined): number | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (/present|current|now|ongoing/.test(v)) return 9999;
  const years = v.match(/\b(19|20)\d{2}\b/g);
  if (!years || years.length === 0) return null;
  // Prefer the later year in a range string for "end" semantics; for start, first year.
  return Number(years[years.length - 1]);
}

function experienceReverseChronological(extracted: ExtractedResumeData): {
  ok: boolean | null;
  finding: Finding | null;
} {
  const dated = extracted.experience
    .map((e) => ({
      label: [e.title, e.company].filter(Boolean).join(' @ ') || 'role',
      start: parseYearHint(e.startDate),
      end: parseYearHint(e.endDate) ?? parseYearHint(e.startDate),
    }))
    .filter((e) => e.end != null);

  if (dated.length < 2) {
    return { ok: null, finding: null };
  }

  for (let i = 0; i < dated.length - 1; i++) {
    const a = dated[i].end!;
    const b = dated[i + 1].end!;
    if (a < b) {
      return {
        ok: false,
        finding: {
          id: 'not_reverse_chrono',
          severity: 'warning',
          message:
            'Experience entries do not appear in reverse-chronological order (newest first). Most parsers and recruiters expect newest roles at the top.',
        },
      };
    }
  }

  return {
    ok: true,
    finding: {
      id: 'reverse_chrono_ok',
      severity: 'info',
      message: 'Experience dates look reverse-chronological (newest first).',
    },
  };
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Structure Quality score (0–100).
 * Weights (judgment): sections 65 · chronology 20 · length 15.
 */
export function analyzeStructureQuality(
  extracted: ExtractedResumeData,
  rawText: string,
): StructureQualityResult {
  const findings: Finding[] = [];
  let score = 0;

  const hasExp = extracted.experience.some(
    (e) => e.company || e.title || e.startDate || e.endDate,
  );
  const hasEdu = extracted.education.some((e) => e.institution || e.degree || e.year);
  const hasSkills = extracted.skills.length > 0;

  if (hasExp) {
    score += 25;
    findings.push({
      id: 'section_experience',
      severity: 'info',
      message: 'Experience section was extracted with at least one role.',
    });
  } else {
    findings.push({
      id: 'missing_experience',
      severity: 'error',
      message: 'No experience entries were extracted. Parsers often treat this as an incomplete resume.',
    });
  }

  if (hasEdu) {
    score += 20;
    findings.push({
      id: 'section_education',
      severity: 'info',
      message: 'Education section was extracted.',
    });
  } else {
    findings.push({
      id: 'missing_education',
      severity: 'warning',
      message: 'No education entries were extracted.',
    });
  }

  if (hasSkills) {
    score += 20;
    findings.push({
      id: 'section_skills',
      severity: 'info',
      message: `Skills list extracted (${extracted.skills.length} item${extracted.skills.length === 1 ? '' : 's'}).`,
    });
  } else {
    findings.push({
      id: 'missing_skills',
      severity: 'warning',
      message: 'No skills were extracted. A clear Skills section helps keyword search after parsing.',
    });
  }

  const chrono = experienceReverseChronological(extracted);
  if (chrono.ok === true) {
    score += 20;
    if (chrono.finding) findings.push(chrono.finding);
  } else if (chrono.ok === false) {
    if (chrono.finding) findings.push(chrono.finding);
  } else {
    findings.push({
      id: 'chrono_insufficient_dates',
      severity: 'info',
      message: 'Not enough dated experience entries to verify reverse-chronological order.',
    });
    // Neutral credit when unverifiable
    score += 10;
  }

  const words = wordCount(rawText);
  // Sane resume length band for campus/early-career PDFs
  if (words >= 200 && words <= 1200) {
    score += 15;
    findings.push({
      id: 'length_ok',
      severity: 'info',
      message: `Resume length looks reasonable (~${words} words).`,
    });
  } else if (words < 200) {
    findings.push({
      id: 'length_short',
      severity: 'warning',
      message: `Resume text is short (~${words} words). Thin extracts are harder for parsers and keyword search.`,
    });
    score += 5;
  } else {
    findings.push({
      id: 'length_long',
      severity: 'info',
      message: `Resume text is long (~${words} words). Consider tightening older roles so the important signals stay near the top.`,
    });
    score += 10;
  }

  return { score: clampScore(score), findings };
}
