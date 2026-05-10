import type { ParsedJobDescription } from '@/types/app.types';

/** One-line status for the JD card (professional, no product-internals wording). */
export function jobDescriptionSummaryLine(parsed: ParsedJobDescription): string {
  const title = parsed.role_title.trim();
  const r = parsed.responsibilities.length;
  const q = parsed.requirements.length;
  const sk = parsed.skills_keywords.length;
  const parts: string[] = [];
  if (r > 0) parts.push(`${r} role focus area${r === 1 ? '' : 's'}`);
  if (q > 0) parts.push(`${q} requirement${q === 1 ? '' : 's'}`);
  if (sk > 0) parts.push(`${sk} skill keyword${sk === 1 ? '' : 's'}`);
  const detail = parts.length > 0 ? parts.join(' · ') : 'Summary available in preview';
  if (title) return `${title} — ${detail}`;
  return detail;
}
