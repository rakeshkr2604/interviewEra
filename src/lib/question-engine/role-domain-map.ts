/**
 * Role → default-domain suggestion for the Question Generator form.
 *
 * Two layers, both conservative: an exact-match map seeded from the form's
 * suggested-role chips and the programmatic-SEO role catalogue
 * (src/lib/seo/programmatic/roles.ts), then a keyword heuristic for free text.
 * Roles whose SEO category has no QG domain equivalent (quality, operations,
 * design, security) are pinned to 'general' so the keyword layer can't force
 * a wrong mapping (e.g. "QA Engineer" must not become software engineering).
 * Anything unrecognised falls back to 'general' — never guess wrong.
 */

import type { QgDomain } from './schemas';

function normalizeRole(role: string): string {
  return role.trim().toLowerCase().replace(/\s+/g, ' ');
}

const EXACT_ROLE_DOMAIN: Record<string, QgDomain> = {
  // Form chips (SUGGESTED_ROLES in QuestionGeneratorForm.tsx)
  'software engineer': 'software engineering',
  'product manager': 'product management',
  'data scientist': 'data science',
  'business analyst': 'general',
  'marketing manager': 'marketing',
  'frontend developer': 'software engineering',
  // roles.ts — category: engineering
  'backend developer': 'software engineering',
  'full stack developer': 'software engineering',
  'java developer': 'software engineering',
  'python developer': 'software engineering',
  'react developer': 'software engineering',
  'node.js developer': 'software engineering',
  'devops engineer': 'software engineering',
  'cloud engineer': 'software engineering',
  'android developer': 'software engineering',
  'ios developer': 'software engineering',
  // roles.ts — category: data
  'data analyst': 'data science',
  'machine learning engineer': 'data science',
  // roles.ts — categories with no QG domain equivalent (quality/operations/design/security):
  // pinned to 'general' so the keyword heuristic can't misfire on them.
  'qa engineer': 'general',
  'system analyst': 'general',
  'ui/ux designer': 'general',
  'cybersecurity analyst': 'general',
};

interface KeywordRule {
  domain: QgDomain;
  pattern: RegExp;
}

// Order matters: more specific domains first so e.g. "ML Engineer" resolves to
// data science before the generic /engineer/ rule catches it.
const KEYWORD_RULES: readonly KeywordRule[] = [
  {
    domain: 'data science',
    pattern: /data scien|data analy|machine learning|ml engineer|\bml\b|\bai\b/i,
  },
  { domain: 'product management', pattern: /product manage|product owner|\bpm\b/i },
  { domain: 'marketing', pattern: /marketing|growth|\bseo\b|\bbrand\b/i },
  {
    domain: 'software engineering',
    pattern: /engineer|developer|programmer|\bsde\b|\bswe\b|full[- ]?stack|front[- ]?end|back[- ]?end/i,
  },
];

/**
 * Suggest a default QG domain for a role string. Returns 'general' when there
 * is no confident suggestion (callers should treat 'general' as "no opinion").
 */
export function suggestDomainForRole(role: string): QgDomain {
  const normalized = normalizeRole(role);
  if (!normalized) return 'general';

  const exact = EXACT_ROLE_DOMAIN[normalized];
  if (exact) return exact;

  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(normalized)) return rule.domain;
  }
  return 'general';
}
