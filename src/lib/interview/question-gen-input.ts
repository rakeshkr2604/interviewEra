/**
 * Bounded inputs for question generation (latency-critical).
 */

import type { ParsedResume } from '@/types/app.types';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { clampText } from '@/lib/ai/context-hygiene';

export const QUESTION_GEN_JD_MAX_CHARS = 1_800;
export const QUESTION_GEN_RESUME_SUMMARY_MAX = 600;
/** Slightly larger budget for script turns — projects matter for freshers. */
export const SCRIPT_RESUME_SUMMARY_MAX = 750;

export function buildCompactResumeSummary(resume: ParsedResume | unknown, role: string): string {
  const p = coerceParsedResume(resume);
  const skills = p.skills.slice(0, 10).join(', ');
  const target = p.target_role || role;
  const exp = p.experience_estimate;
  let s = `Target:${target}. Skills:${skills || 'n/a'}. Experience:${exp}`;
  if (role && role !== target) s += `. InterviewRole:${role}`;
  return clampText(s, QUESTION_GEN_RESUME_SUMMARY_MAX);
}

/** Extract project titles from slim or legacy parsed_data for script personalization. */
export function extractResumeProjectHints(resume: unknown, max = 4): string[] {
  if (!resume || typeof resume !== 'object') return [];
  const d = resume as Record<string, unknown>;
  const projects = d.projects;
  if (!Array.isArray(projects)) return [];
  const out: string[] = [];
  for (const item of projects) {
    if (typeof item === 'string' && item.trim()) {
      out.push(item.trim().slice(0, 80));
    } else if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>;
      const title =
        (typeof row.title === 'string' && row.title.trim()) ||
        (typeof row.name === 'string' && row.name.trim()) ||
        (typeof row.project_name === 'string' && row.project_name.trim()) ||
        '';
      if (title) out.push(title.slice(0, 80));
    }
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Script-engine resume summary: compact profile + project hints when present
 * (critical for fresher personalization).
 */
export function buildScriptResumeSummary(resume: ParsedResume | unknown, role: string): string {
  const base = buildCompactResumeSummary(resume, role);
  const projects = extractResumeProjectHints(resume);
  if (projects.length === 0) return clampText(base, SCRIPT_RESUME_SUMMARY_MAX);
  return clampText(`${base}. Projects:${projects.join('; ')}`, SCRIPT_RESUME_SUMMARY_MAX);
}

export function clampJobDescriptionForQuestions(jd: string | undefined): string | undefined {
  const t = jd?.trim();
  if (!t) return undefined;
  return clampText(t, QUESTION_GEN_JD_MAX_CHARS);
}
