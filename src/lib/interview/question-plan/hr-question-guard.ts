/**
 * Content check for behavioral/HR core questions. The generator labels its own
 * category, so a Linux-debugging question tagged "behavioral" passes a
 * category-only filter. This looks at the text instead.
 */

import { isHypotheticalFraming } from '@/lib/ai/scripts/hypothetical-framing-guard';

const TECHNICAL_CONTENT_PATTERNS: RegExp[] = [
  /\b(debug(ging)?|deploy(ing|ment)?|codebase|refactor(ing)?|architect(ure|ing)?|system design|scaling|scalability|latency|throughput|bottleneck)\b/i,
  /\b(api|apis|rest apis?|graphql|database|sql|nosql|schema|caching|server|backend|back-end|front-end|frontend|microservices?)\b/i,
  /\b(algorithm|data structures?|big-?o|race condition|performance degradation)\b/i,
  /\b(linux|bash|docker|kubernetes|aws|azure|gcp|ci\/cd)\b/i,
  /(\bc\+\+|\b(java|python|javascript|typescript|react|node\.?js|golang|kotlin)\b)/i,
  /\b(trade-?offs?|tech(nical)? stack|integrat(e|ing|ion) (a |an |the )?(new )?(ai )?model)\b/i,
  /\b(your (technical )?skills include|technical skills|walk me through how (the|your) (code|system))\b/i,
];

export function hasTechnicalContent(text: string): boolean {
  if (!text) return false;
  return TECHNICAL_CONTENT_PATTERNS.some((re) => re.test(text));
}

/** True when a behavioral/HR question is hypothetical or really a technical question. */
export function isUnsuitableHrQuestion(text: string): boolean {
  return isHypotheticalFraming(text) || hasTechnicalContent(text);
}
