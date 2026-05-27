/**
 * Normalize stored / legacy parsed_data into the slim interview profile schema.
 */

import type { ParsedResume, ResumeParseQuality } from '@/types/app.types';

const MAX_SKILLS = 12;
const MAX_SKILL_LEN = 32;

function coerceString(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function coerceSkills(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of val) {
    if (typeof item !== 'string') continue;
    const s = item.trim().slice(0, MAX_SKILL_LEN);
    if (!s || s.length < 2) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

function legacyTargetRole(d: Record<string, unknown>): string {
  const roles = d.target_roles;
  if (Array.isArray(roles) && typeof roles[0] === 'string' && roles[0].trim()) {
    return roles[0].trim().slice(0, 120);
  }
  const exp = d.experience;
  if (Array.isArray(exp) && exp[0] && typeof exp[0] === 'object') {
    const role = coerceString((exp[0] as Record<string, unknown>).role);
    if (role && role.length < 80 && !role.includes(',')) return role;
  }
  return 'Software Engineer';
}

function legacyExperienceEstimate(d: Record<string, unknown>): string {
  const direct = coerceString(d.experience_estimate);
  if (direct) return direct.slice(0, 48);

  const exp = d.experience;
  if (!Array.isArray(exp) || exp.length === 0) {
    const edu = d.education;
    if (Array.isArray(edu) && edu.length > 0) return 'Fresher / student';
    return 'Not specified';
  }

  const jobCount = exp.filter(
    (e) => e && typeof e === 'object' && coerceString((e as Record<string, unknown>).role),
  ).length;

  if (jobCount >= 3) return '3–5 years';
  if (jobCount === 2) return '1–3 years';
  if (jobCount === 1) return '0–2 years';
  return 'Not specified';
}

function legacySkills(d: Record<string, unknown>): string[] {
  const fromSkills = coerceSkills(d.skills);
  if (fromSkills.length > 0) return fromSkills;

  const projects = d.projects;
  if (!Array.isArray(projects)) return [];
  const blob = projects
    .map((p) => (p && typeof p === 'object' ? coerceString((p as Record<string, unknown>).description) : ''))
    .join(' ');
  const hints = blob.match(
    /\b(?:JavaScript|TypeScript|Python|React|Node\.?js|MongoDB|PostgreSQL|AWS|Docker|Java|Go)\b/gi,
  );
  return coerceSkills(hints ?? []);
}

export function coerceParsedResume(raw: unknown): ParsedResume {
  const empty: ParsedResume = {
    target_role: 'Software Engineer',
    skills: [],
    experience_estimate: 'Not specified',
  };

  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Record<string, unknown>;

  const parse_quality = d.parse_quality as ResumeParseQuality | undefined;
  const parse_warning = coerceString(d.parse_warning) || undefined;

  if (typeof d.target_role === 'string') {
    return {
      target_role: coerceString(d.target_role).slice(0, 120) || empty.target_role,
      skills: coerceSkills(d.skills),
      experience_estimate: coerceString(d.experience_estimate).slice(0, 48) || empty.experience_estimate,
      parse_quality,
      parse_warning,
    };
  }

  return {
    target_role: legacyTargetRole(d),
    skills: legacySkills(d),
    experience_estimate: legacyExperienceEstimate(d),
    parse_quality,
    parse_warning,
  };
}
