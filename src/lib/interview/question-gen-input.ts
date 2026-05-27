/**
 * Bounded inputs for question generation (latency-critical).
 */

import type { ParsedResume } from '@/types/app.types';
import { clampText } from '@/lib/ai/context-hygiene';

export const QUESTION_GEN_JD_MAX_CHARS = 1_800;
export const QUESTION_GEN_RESUME_SUMMARY_MAX = 1_100;

export function buildCompactResumeSummary(resume: ParsedResume, role: string): string {
  const skills = resume.skills.slice(0, 10).join(', ');
  const exp = resume.experience
    .slice(0, 3)
    .map((e) => `${e.role}@${e.company}`)
    .join('; ');
  const projects = resume.projects
    .slice(0, 2)
    .map((p) => p.name)
    .join(', ');
  let s = `Role:${role}. Skills:${skills || 'n/a'}`;
  if (exp) s += `. Exp:${exp}`;
  if (projects) s += `. Projects:${projects}`;
  return clampText(s, QUESTION_GEN_RESUME_SUMMARY_MAX);
}

export function clampJobDescriptionForQuestions(jd: string | undefined): string | undefined {
  const t = jd?.trim();
  if (!t) return undefined;
  return clampText(t, QUESTION_GEN_JD_MAX_CHARS);
}
