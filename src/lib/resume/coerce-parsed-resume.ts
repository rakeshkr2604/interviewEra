/**
 * Normalize stored / legacy / LLM parsed_data into the interview profile schema.
 * parse-v2 preserves experience / education / projects; never invents missing sections.
 */

import type {
  ParsedResume,
  ParsedResumeSectionsMissing,
  ResumeEducationEntry,
  ResumeExperienceEntry,
  ResumeParseQuality,
  ResumeProjectEntry,
} from '@/types/app.types';
import { parsedResumeV2Schema } from '@/lib/resume/parsed-resume-schema';
import { isInternshipExperienceEntry, refineExperienceEstimate } from '@/lib/resume/experience-band';

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

function coerceBullets(val: unknown, max = 3): string[] {
  if (!Array.isArray(val)) {
    const single = coerceString(val);
    return single ? [single.slice(0, 280)] : [];
  }
  const out: string[] = [];
  for (const item of val) {
    const s = coerceString(item).slice(0, 280);
    if (!s) continue;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function coerceStringList(val: unknown, max = 12, maxLen = 48): string[] {
  if (!Array.isArray(val)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of val) {
    const s = coerceString(item).slice(0, maxLen);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function experienceEntryMeaningful(e: ResumeExperienceEntry): boolean {
  return Boolean(e.organization || e.title || e.date_range || e.bullets.length > 0);
}

function educationEntryMeaningful(e: ResumeEducationEntry): boolean {
  return Boolean(e.institution || e.degree || e.year_range);
}

function projectEntryMeaningful(e: ResumeProjectEntry): boolean {
  return Boolean(e.name || e.description || e.technologies.length > 0);
}

function coerceExperienceEntries(val: unknown): ResumeExperienceEntry[] {
  if (!Array.isArray(val)) return [];
  const out: ResumeExperienceEntry[] = [];
  for (const item of val) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const entry: ResumeExperienceEntry = {
      organization:
        coerceString(row.organization) ||
        coerceString(row.company) ||
        coerceString(row.employer),
      title: coerceString(row.title) || coerceString(row.role),
      date_range:
        coerceString(row.date_range) ||
        coerceString(row.duration) ||
        coerceString(row.dates),
      bullets: coerceBullets(row.bullets ?? row.description),
    };
    if (entry.bullets.length === 0) {
      entry.bullets = coerceBullets(row.description);
    }
    if (!experienceEntryMeaningful(entry)) continue;
    out.push({
      organization: entry.organization.slice(0, 160),
      title: entry.title.slice(0, 160),
      date_range: entry.date_range.slice(0, 80),
      bullets: entry.bullets,
    });
    if (out.length >= 6) break;
  }
  return out;
}

function coerceEducationEntries(val: unknown): ResumeEducationEntry[] {
  if (!Array.isArray(val)) return [];
  const out: ResumeEducationEntry[] = [];
  for (const item of val) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const entry: ResumeEducationEntry = {
      institution: coerceString(row.institution) || coerceString(row.school) || coerceString(row.university),
      degree: coerceString(row.degree) || coerceString(row.program),
      year_range:
        coerceString(row.year_range) ||
        coerceString(row.graduation_year) ||
        coerceString(row.dates) ||
        coerceString(row.duration),
    };
    if (!educationEntryMeaningful(entry)) continue;
    out.push({
      institution: entry.institution.slice(0, 160),
      degree: entry.degree.slice(0, 160),
      year_range: entry.year_range.slice(0, 80),
    });
    if (out.length >= 6) break;
  }
  return out;
}

function coerceProjectEntries(val: unknown): ResumeProjectEntry[] {
  if (!Array.isArray(val)) return [];
  const out: ResumeProjectEntry[] = [];
  for (const item of val) {
    if (typeof item === 'string') {
      const name = item.trim().slice(0, 160);
      if (name) out.push({ name, description: '', technologies: [] });
      if (out.length >= 6) break;
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const name =
      coerceString(row.name) ||
      coerceString(row.title) ||
      coerceString(row.project_name);
    let technologies = coerceStringList(row.technologies);
    if (technologies.length === 0) technologies = coerceStringList(row.tech_stack);
    if (technologies.length === 0) technologies = coerceStringList(row.tech);
    const entry: ResumeProjectEntry = {
      name: name.slice(0, 160),
      description: coerceString(row.description).slice(0, 400),
      technologies,
    };
    if (!projectEntryMeaningful(entry)) continue;
    out.push(entry);
    if (out.length >= 6) break;
  }
  return out;
}

function coerceSectionsMissing(
  raw: unknown,
  experience: ResumeExperienceEntry[],
  education: ResumeEducationEntry[],
  projects: ResumeProjectEntry[],
): ParsedResumeSectionsMissing {
  const d =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const fromModel =
    d.sections_missing && typeof d.sections_missing === 'object'
      ? (d.sections_missing as Record<string, unknown>)
      : {};
  return {
    experience:
      typeof fromModel.experience === 'boolean'
        ? fromModel.experience
        : experience.length === 0,
    education:
      typeof fromModel.education === 'boolean'
        ? fromModel.education
        : education.length === 0,
    projects:
      typeof fromModel.projects === 'boolean'
        ? fromModel.projects
        : projects.length === 0,
  };
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

  const jobCount = exp.filter((e) => {
    if (!e || typeof e !== 'object') return false;
    const row = e as Record<string, unknown>;
    const title = coerceString(row.role) || coerceString(row.title);
    if (!title) return false;
    // Internships must not inflate legacy year bands
    return !isInternshipExperienceEntry({
      organization: coerceString(row.organization) || coerceString(row.company),
      title,
      date_range: coerceString(row.date_range) || coerceString(row.duration),
      bullets: [],
    });
  }).length;

  if (jobCount === 0) {
    // Experience rows were all internships (or empty titles)
    if (exp.length > 0) return '0-1 years';
    return 'Not specified';
  }
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

function attachSections(
  base: ParsedResume,
  d: Record<string, unknown>,
): ParsedResume {
  const experience = coerceExperienceEntries(d.experience ?? d.experience_entries);
  const education = coerceEducationEntries(d.education);
  const projects = coerceProjectEntries(d.projects);
  const sections_missing = coerceSectionsMissing(d, experience, education, projects);
  return {
    ...base,
    experience_estimate: refineExperienceEstimate(base.experience_estimate, experience),
    experience,
    education,
    projects,
    sections_missing,
  };
}

/**
 * Prefer Zod-normalized LLM payloads when they look like parse-v2 JSON;
 * always finish through string/array guards so stored rows stay safe.
 */
export function coerceParsedResume(raw: unknown): ParsedResume {
  const empty: ParsedResume = {
    target_role: 'Software Engineer',
    skills: [],
    experience_estimate: 'Not specified',
    experience: [],
    education: [],
    projects: [],
    sections_missing: { experience: true, education: true, projects: true },
  };

  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Record<string, unknown>;

  const parse_quality = d.parse_quality as ResumeParseQuality | undefined;
  const parse_warning = coerceString(d.parse_warning) || undefined;

  // Soft Zod pass only for parse-v2 / target_role-shaped LLM payloads.
  // Do not apply Zod defaults to legacy blobs (empty experience[] would wipe jobs).
  const zodPass = parsedResumeV2Schema.safeParse(raw);
  if (zodPass.success && typeof d.target_role === 'string') {
    const z = zodPass.data;
    const base: ParsedResume = {
      target_role: coerceString(z.target_role).slice(0, 120) || empty.target_role,
      skills: coerceSkills(z.skills.length ? z.skills : d.skills),
      experience_estimate:
        coerceString(z.experience_estimate).slice(0, 48) || empty.experience_estimate,
      parse_quality,
      parse_warning,
    };
    const projectsFromZod = z.projects.map((p) => ({
      name: p.name || p.title || '',
      description: p.description,
      technologies: p.technologies,
    }));
    return attachSections(base, {
      ...d,
      experience: Array.isArray(d.experience) ? d.experience : z.experience,
      education: Array.isArray(d.education) ? d.education : z.education,
      projects: Array.isArray(d.projects) ? d.projects : projectsFromZod,
      sections_missing: z.sections_missing ?? d.sections_missing,
    });
  }

  if (typeof d.target_role === 'string') {
    const base: ParsedResume = {
      target_role: coerceString(d.target_role).slice(0, 120) || empty.target_role,
      skills: coerceSkills(d.skills),
      experience_estimate:
        coerceString(d.experience_estimate).slice(0, 48) || empty.experience_estimate,
      parse_quality,
      parse_warning,
    };
    return attachSections(base, d);
  }

  const base: ParsedResume = {
    target_role: legacyTargetRole(d),
    skills: legacySkills(d),
    experience_estimate: legacyExperienceEstimate(d),
    parse_quality,
    parse_warning,
  };
  return attachSections(base, d);
}
