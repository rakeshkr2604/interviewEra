/**
 * Central list of `robots.txt` disallow prefixes.
 * Do **not** list `/_next/` — Google needs JS/CSS for rendering; blocking hurts indexing.
 */
export const ROBOTS_DISALLOW_PREFIXES = [
  '/api/',
  '/admin/',
  '/dashboard',
  '/onboarding',
  '/interview/',
  '/report/',
  '/history',
  '/analytics',
  '/settings',
  '/upgrade',
  '/feedback',
  '/auth/callback',
  '/tools/question-generator/results',
  '/tools/ats-checker/results',
  '/tools/star-builder/results',
] as const;
