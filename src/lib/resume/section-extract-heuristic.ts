/**
 * Best-effort section extraction for heuristic fallback (no LLM).
 * Handles single-line PDF extracts (common with LaTeX/Overleaf).
 * Empty sections + missing flags when content is absent — never invent.
 */

import type {
  ParsedResumeSectionsMissing,
  ResumeEducationEntry,
  ResumeExperienceEntry,
  ResumeProjectEntry,
} from '@/types/app.types';

export type HeuristicSections = {
  experience: ResumeExperienceEntry[];
  education: ResumeEducationEntry[];
  projects: ResumeProjectEntry[];
  sections_missing: ParsedResumeSectionsMissing;
};

/**
 * Section headers in this pipeline are ALL-CAPS tokens (EDUCATION / EXPERIENCE / …).
 * Case-insensitive matching falsely hits prose ("with experience building…").
 */
function sliceSection(text: string, header: RegExp): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  // Preserve caller's case-sensitivity (do not force `i`).
  const headerRe = new RegExp(header.source, header.flags.replace('g', ''));
  const m = headerRe.exec(flat);
  if (!m || m.index === undefined) return '';
  const after = flat.slice(m.index + m[0].length);
  const nextRe =
    /\b(?:SUMMARY|EDUCATION|SKILLS|EXPERIENCE|WORK\s+EXPERIENCE|PROJECTS?|ACHIEVEMENTS?|CERTIFICATIONS?)\b/;
  const next = nextRe.exec(after);
  if (next && next.index > 0) return after.slice(0, next.index).trim();
  return after.trim();
}

function extractEducation(block: string): ResumeEducationEntry[] {
  if (!block) return [];
  const flat = block.replace(/\s+/g, ' ').trim();
  const out: ResumeEducationEntry[] = [];

  const degreeRe =
    /((?:Master|Bachelor|B\.?\s*Tech|M\.?\s*Tech|MCA|BCA|Minor|Diploma)[\w\s.&-]{0,80}?)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}|\d{4})\s+(.+?)(?:\s+CGPA|\s+GPA|$)/gi;

  for (const m of flat.matchAll(degreeRe)) {
    out.push({
      degree: (m[1] ?? '').trim().replace(/\s+/g, ' ').slice(0, 160),
      year_range: (m[2] ?? '').trim().slice(0, 80),
      institution: (m[3] ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\s+Minor\b.*/i, '')
        .slice(0, 160),
    });
    if (out.length >= 4) break;
  }
  return out.filter((e) => e.degree || e.institution);
}

function extractExperience(block: string): ResumeExperienceEntry[] {
  if (!block) return [];
  const flat = block.replace(/\s+/g, ' ').trim();
  const out: ResumeExperienceEntry[] = [];

  // Title — Org   Date – Present
  const re =
    /([A-Za-z][A-Za-z0-9/&.+\-\s]{2,70}?)\s+[—–-]\s+([A-Za-z0-9][A-Za-z0-9.&/\-\s]{2,70}?)\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\s*[–—-]\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}))/gi;

  for (const m of flat.matchAll(re)) {
    const title = (m[1] ?? '').trim();
    const organization = (m[2] ?? '').trim();
    const date_range = (m[3] ?? '').trim();
    const afterIdx = (m.index ?? 0) + m[0].length;
    const rest = flat.slice(afterIdx, afterIdx + 800);
    const bullets = [...rest.matchAll(/•\s*([^•]{15,280})/g)]
      .map((b) => (b[1] ?? '').trim().replace(/\s+/g, ' ').slice(0, 280))
      .filter(Boolean)
      .slice(0, 3);
    out.push({ organization, title, date_range, bullets });
    if (out.length >= 4) break;
  }
  return out;
}

function extractProjects(block: string): ResumeProjectEntry[] {
  if (!block) return [];
  const flat = block.replace(/\s+/g, ' ').trim();
  const out: ResumeProjectEntry[] = [];

  // Prefer "Name – Description Live | dates" headers (avoid matching mid-bullet text).
  const headerRe =
    /(?:^|\s)([A-Z][A-Za-z0-9](?:[\w./-]|\s(?![a-z])){0,50}?)\s+[–—-]\s+([A-Z][^•|]{8,100}?)\s+(?:Live\b|\|)/g;

  for (const m of flat.matchAll(headerRe)) {
    const name = (m[1] ?? '').trim();
    if (!name || /^(skills|experience|education|achievements|google search)$/i.test(name)) continue;
    // Drop leading junk glued from prior bullet ("…. SkillBridge AI")
    const cleanedName = name.replace(/^.*\.\s+/, '').trim();
    if (cleanedName.length < 2) continue;
    const description = (m[2] ?? '').trim().replace(/\s+/g, ' ').slice(0, 400);
    const afterIdx = (m.index ?? 0) + m[0].length;
    const body = flat.slice(afterIdx, afterIdx + 500);
    const techChunk = body.match(
      /\b((?:Next\.js|React|TypeScript|Node\.js|Python|Java|PostgreSQL|MongoDB|Express|Prisma|OpenAI|OpenRouter|Supabase|Redis|Vercel)[^•]{0,200})/i,
    );
    const technologies = (techChunk?.[1] ?? '')
      .split(/,\s*/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && t.length <= 40)
      .slice(0, 12);
    out.push({
      name: cleanedName.slice(0, 160),
      description,
      technologies,
    });
    if (out.length >= 4) break;
  }
  return out.filter((p) => p.name.length >= 2 && !/\bSearch\b/i.test(p.name));
}

export function extractSectionsHeuristic(rawText: string): HeuristicSections {
  const text = rawText.replace(/\u00a0/g, ' ');
  const education = extractEducation(sliceSection(text, /\bEDUCATION\b/));
  const experience = extractExperience(sliceSection(text, /\b(?:EXPERIENCE|WORK\s+EXPERIENCE)\b/));
  const projects = extractProjects(sliceSection(text, /\bPROJECTS?\b/));

  return {
    experience,
    education,
    projects,
    sections_missing: {
      experience: experience.length === 0,
      education: education.length === 0,
      projects: projects.length === 0,
    },
  };
}
