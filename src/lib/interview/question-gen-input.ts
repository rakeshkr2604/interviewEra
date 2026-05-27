/**
 * Bounded inputs for question generation (latency-critical).
 */

import type { ParsedResume } from '@/types/app.types';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { clampText } from '@/lib/ai/context-hygiene';

export const QUESTION_GEN_JD_MAX_CHARS = 1_800;
export const QUESTION_GEN_RESUME_SUMMARY_MAX = 600;

export function buildCompactResumeSummary(resume: ParsedResume | unknown, role: string): string {
  const p = coerceParsedResume(resume);
  const skills = p.skills.slice(0, 10).join(', ');
  const target = p.target_role || role;
  const exp = p.experience_estimate;
  let s = `Target:${target}. Skills:${skills || 'n/a'}. Experience:${exp}`;
  if (role && role !== target) s += `. InterviewRole:${role}`;
  return clampText(s, QUESTION_GEN_RESUME_SUMMARY_MAX);
}

export function clampJobDescriptionForQuestions(jd: string | undefined): string | undefined {
  const t = jd?.trim();
  if (!t) return undefined;
  return clampText(t, QUESTION_GEN_JD_MAX_CHARS);
}
