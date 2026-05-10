import type { ParsedJobDescription } from '@/types/app.types';

/**
 * Compact briefing string sent to interview/question context from structured JD.
 */
export function formatParsedJobDescriptionForInterview(p: ParsedJobDescription): string {
  const chunks: string[] = [];

  const push = (label: string, value: string) => {
    const v = value.trim();
    if (v) chunks.push(`${label}: ${v}`);
  };

  push('Role', p.role_title);
  push('Company', p.company_employer);
  push('Location', p.location);
  push('Employment type', p.employment_type);
  if (p.about_role.trim()) {
    chunks.push(`About the role:\n${p.about_role.trim()}`);
  }

  const bullets = (title: string, items: string[]) => {
    const clean = items.map((s) => s.trim()).filter(Boolean);
    if (clean.length === 0) return;
    chunks.push(`${title}:\n${clean.map((s) => `• ${s}`).join('\n')}`);
  };

  bullets('Responsibilities', p.responsibilities);
  bullets('Requirements', p.requirements);
  bullets('Must-have', p.must_have);
  bullets('Nice-to-have', p.nice_to_have);
  bullets('Skills / keywords', p.skills_keywords);
  bullets('Education / eligibility', p.education_eligibility);
  push('Compensation / benefits', p.compensation_notes);

  return chunks.join('\n\n').trim();
}
