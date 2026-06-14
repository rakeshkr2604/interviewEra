/**
 * Central list of `robots.txt` disallow prefixes.
 * Do **not** list `/_next/` — Google needs JS/CSS for rendering; blocking hurts indexing.
 *
 * Do **not** disallow `/dashboard` here — it causes GSC "Indexed though blocked by
 * robots.txt" when Google already has the URL. Use `noindex` metadata + `X-Robots-Tag`
 * (see `next.config.ts`) so crawlers can recrawl and drop the URL from the index.
 */
export const ROBOTS_DISALLOW_PREFIXES = [
  '/api/',
  '/admin/',
  '/onboarding',
  '/interview/',
  '/report/',
  '/history',
  '/analytics',
  '/settings',
  '/upgrade',
  '/feedback',
  '/auth/callback',
  '/college/dashboard',
  '/college/signup',
  '/tools/question-generator/results',
  '/tools/ats-checker/results',
  '/tools/star-builder/results',
] as const;
