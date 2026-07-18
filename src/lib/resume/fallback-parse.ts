/**
 * Fast heuristic interview profile when AI parse fails.
 */

import type { ParsedResume, ResumeParseQuality } from '@/types/app.types';
import { sampleTextForHeuristic } from '@/lib/resume/parse-input';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { extractSectionsHeuristic } from '@/lib/resume/section-extract-heuristic';

const SKILL_HINTS =
  /\b(?:javascript|typescript|python|java|react|node\.?js|sql|aws|docker|mongodb|postgresql|mysql|next\.?js|fastapi|express|git|html|css|c\+\+|golang|go\b)\b/gi;

const ROLE_HINTS =
  /\b(software\s+engineer|full[\s-]?stack\s+developer|backend\s+developer|frontend\s+developer|data\s+scientist|devops\s+engineer|sde)\b/i;

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(SKILL_HINTS)) {
    if (m[0]) found.add(m[0].charAt(0).toUpperCase() + m[0].slice(1).toLowerCase());
  }
  return [...found].slice(0, 12);
}

function inferTargetRole(text: string, skills: string[]): string {
  const m = text.match(ROLE_HINTS);
  if (m?.[0]) {
    return m[0]
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }
  if (skills.length > 0) return 'Software Engineer';
  return 'Software Engineer';
}

function inferExperienceEstimate(text: string): string {
  const lower = text.toLowerCase();
  const hasInternship = /\b(?:intern(?:ship)?|trainee|apprentice|co[\s-]?op)\b/.test(lower);
  const hasProfessionalRole =
    /\b(?:founder|full[\s-]?stack|software\s+engineer|sde\b|full[\s-]?time|permanent)\b/.test(
      lower,
    ) ||
    (/\b(?:engineer|developer)\b/.test(lower) &&
      !/\b(?:intern(?:ship)?|trainee|apprentice)\b/.test(lower));

  // Internship-only resume → fresher band (do not treat "Present" intern roles as YoE)
  if (hasInternship && !hasProfessionalRole) {
    return '0-1 years';
  }

  if (/\b(?:fresher|student|pursuing|expected\s+\d{4}|b\.?\s*tech|mca|master\s+of)\b/.test(lower)) {
    if (!/\b(?:years?\s+of\s+experience|\d+\+?\s*years?)\b/.test(lower)) {
      return 'Fresher';
    }
  }
  const years = text.match(/\b(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/i);
  if (years) {
    const n = Number(years[1]);
    if (n >= 5) return '5+ years';
    if (n >= 3) return '3-5 years';
    if (n >= 1) return '1-3 years';
    return '0-1 years';
  }
  if (/\bpresent\b/i.test(text) && hasProfessionalRole) {
    return '0-2 years';
  }
  return 'Not specified';
}

export function assessHeuristicQuality(data: ParsedResume): ResumeParseQuality {
  const signals =
    (data.target_role.trim() ? 1 : 0) +
    (data.skills.length >= 2 ? 1 : 0) +
    (data.experience_estimate !== 'Not specified' ? 1 : 0);
  if (signals >= 3) return 'full';
  if (signals >= 1) return 'degraded';
  return 'minimal';
}

export function buildFallbackParsedResume(rawText: string): {
  data: ParsedResume;
  quality: ResumeParseQuality;
} {
  const text = sampleTextForHeuristic(rawText);
  const skills = extractSkills(text);
  const target_role = inferTargetRole(text, skills);
  const experience_estimate = inferExperienceEstimate(text);

  const sections = extractSectionsHeuristic(rawText);
  const data = coerceParsedResume({
    target_role,
    skills,
    experience_estimate,
    experience: sections.experience,
    education: sections.education,
    projects: sections.projects,
    sections_missing: sections.sections_missing,
  });

  const quality = assessHeuristicQuality(data);

  return {
    quality,
    data: {
      ...data,
      parse_quality: quality,
      parse_warning:
        quality === 'minimal'
          ? 'We saved a basic profile — interview questions may be more general.'
          : undefined,
    },
  };
}
