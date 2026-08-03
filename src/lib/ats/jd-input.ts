/**
 * Shared JD input limit + lightweight pre-clean for the ATS checker.
 * Client-safe (no Node/server imports) — imported by the form, the server
 * action, and the LLM extraction slice so all three stay in lockstep.
 *
 * Pre-clean is a conservative regex/heuristic pass (no LLM call): it removes
 * job-board chrome that rides along when users paste an entire listing page,
 * so the character budget is spent on actual JD content. Every pattern is an
 * exact-line or anchored match — nothing inside a real sentence is touched.
 */

/**
 * Single source of truth for the JD character limit.
 * Frontend textarea, server action, and LLM prompt slice must all use this —
 * raising one without the others silently truncates the tail of long JDs
 * (where Qualifications / Nice-to-have sections usually live).
 */
export const ATS_JD_MAX_CHARS = 10_000;

/**
 * Lines dropped only when the ENTIRE trimmed line equals one of these
 * (case-insensitive). Job-board button/chrome text — can never appear as a
 * full standalone line inside real JD prose.
 */
export const JD_BOILERPLATE_LINES: ReadonlySet<string> = new Set(
  [
    'apply',
    'apply now',
    'easy apply',
    'quick apply',
    'apply on company website',
    'apply on company site',
    'save',
    'save job',
    'save this job',
    'saved',
    'share',
    'share this job',
    'share job',
    'report job',
    'report this job',
    'report this listing',
    'show more',
    'show less',
    'see more',
    'see less',
    'read more',
    'sign in',
    'sign in to apply',
    'login',
    'log in',
    'register',
    'register to apply',
    'join now',
    'follow',
    'following',
    '+ follow',
    'send message',
    'message',
    'set alert',
    'create job alert',
    'get job alerts',
    'turn on job alerts',
    'back to jobs',
    'back to search',
    'view all jobs',
    'promoted',
    'be an early applicant',
    'actively hiring',
  ].map((s) => s.toLowerCase()),
);

/**
 * Cookie-consent banner text. A line is dropped only if it matches one of
 * these AND is under 300 chars — a guard against removing a real (if odd)
 * JD paragraph that merely mentions cookies.
 */
export const JD_COOKIE_LINE_RE =
  /\b(we use cookies|accept all cookies|reject all cookies|cookie policy|cookie settings|manage (?:cookie )?preferences|this (?:web)?site uses cookies)\b/i;

/**
 * Section headings that mark the start of "other jobs" page chrome. If one
 * appears as a standalone line in the SECOND HALF of the text, everything
 * from that line onward is dropped (trailing related-postings modules).
 */
export const JD_TAIL_SECTION_HEADINGS: ReadonlySet<string> = new Set(
  [
    'similar jobs',
    'related jobs',
    'related postings',
    'people also viewed',
    'people also searched',
    'more jobs like this',
    'recommended jobs',
    'recommended for you',
    'jobs you may be interested in',
    'explore more jobs',
    'browse jobs',
    'explore collaborative articles',
  ].map((s) => s.toLowerCase()),
);

function normalizeLineForMatch(line: string): string {
  // Strip trailing punctuation/arrows job boards add to buttons ("Show more ›")
  return line.trim().replace(/[\s›»…:*_-]+$/g, '').toLowerCase();
}

/**
 * Conservative pre-clean for pasted JD text. Idempotent; pure string work.
 * Returns the cleaned text — callers apply the char-limit slice AFTER
 * cleaning so boilerplate doesn't consume the budget.
 */
export function precleanJdText(raw: string): string {
  // 1. Unicode/whitespace normalization
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[​-‍﻿­]/g, '') // zero-width chars, soft hyphen
    .replace(/ /g, ' '); // nbsp -> space

  const lines = text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trimEnd());

  // 2. Tail truncation at "similar jobs"-style headings (second half only)
  const half = Math.floor(lines.length / 2);
  let end = lines.length;
  for (let i = half; i < lines.length; i++) {
    if (JD_TAIL_SECTION_HEADINGS.has(normalizeLineForMatch(lines[i]!))) {
      end = i;
      break;
    }
  }

  // 3. Per-line boilerplate/cookie removal
  const kept: string[] = [];
  for (let i = 0; i < end; i++) {
    const line = lines[i]!;
    const norm = normalizeLineForMatch(line);
    if (norm.length > 0 && JD_BOILERPLATE_LINES.has(norm)) continue;
    if (line.length < 300 && JD_COOKIE_LINE_RE.test(line)) continue;
    kept.push(line);
  }

  // 4. Collapse 3+ consecutive newlines to 2
  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
