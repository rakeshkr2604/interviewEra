/**
 * Role data for programmatic SEO pages.
 *
 * Architecture notes:
 * - `as const satisfies readonly RoleDefinition[]` validates shape at compile time
 *   while preserving literal types for each `slug` field.
 * - `RoleSlug` is derived from the array — it never drifts out of sync with data.
 * - `Role` is the narrowest type for a single entry (all fields are literal types).
 *
 * Adding a new role:
 * 1. Append an entry to ROLES.
 * 2. The new slug automatically joins the RoleSlug union.
 * 3. Add sitemap priority based on search-volume band (see sitemapPriority comment).
 * 4. Add questions to ROLE_QUESTION_REGISTRY in questions.ts.
 */

import type { RoleDefinition } from './types'

export const ROLES = [
  // ── Engineering ────────────────────────────────────────────────────────────
  {
    slug: 'software-engineer',
    label: 'Software Engineer',
    shortLabel: 'SWE',
    pluralLabel: 'Software Engineers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['data-structures', 'algorithms', 'oops', 'system-design', 'java', 'python'],
    searchIntent: 'navigational',
    sitemapPriority: 0.88,
    description:
      'Curated Software Engineer interview questions for Indian campus placements in 2026. Covers DSA, OOPs, system design, and HR rounds.',
  },
  {
    slug: 'frontend-developer',
    label: 'Frontend Developer',
    shortLabel: 'FE Dev',
    pluralLabel: 'Frontend Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['react', 'javascript', 'html-css', 'typescript', 'rest-api'],
    searchIntent: 'navigational',
    sitemapPriority: 0.85,
    description:
      'Frontend Developer interview questions covering React, JavaScript, CSS, and browser fundamentals — aligned with Indian tech hiring in 2026.',
  },
  {
    slug: 'backend-developer',
    label: 'Backend Developer',
    shortLabel: 'BE Dev',
    pluralLabel: 'Backend Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['node-js', 'java', 'python', 'spring-boot', 'sql', 'rest-api'],
    searchIntent: 'navigational',
    sitemapPriority: 0.84,
    description:
      'Backend Developer interview questions on APIs, databases, system design, and server-side languages asked at Indian tech companies.',
  },
  {
    slug: 'full-stack-developer',
    label: 'Full Stack Developer',
    shortLabel: 'FSD',
    pluralLabel: 'Full Stack Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['react', 'node-js', 'sql', 'rest-api', 'mongodb'],
    searchIntent: 'navigational',
    sitemapPriority: 0.84,
    description:
      'Full Stack Developer interview questions combining frontend, backend, and database concepts for Indian placement drives in 2026.',
  },
  {
    slug: 'java-developer',
    label: 'Java Developer',
    shortLabel: 'Java Dev',
    pluralLabel: 'Java Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['java', 'spring-boot', 'oops', 'data-structures', 'sql', 'dbms'],
    searchIntent: 'navigational',
    sitemapPriority: 0.86,
    description:
      'Java Developer interview questions on Core Java, Spring Boot, OOPs principles, and collections — the most-tested stack at TCS, Infosys, and Wipro.',
  },
  {
    slug: 'python-developer',
    label: 'Python Developer',
    shortLabel: 'Python Dev',
    pluralLabel: 'Python Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['python', 'django', 'sql', 'data-structures', 'algorithms', 'rest-api'],
    searchIntent: 'navigational',
    sitemapPriority: 0.86,
    description:
      'Python Developer interview questions covering core Python, Django, REST APIs, and scripting — popular at startups and service companies alike.',
  },
  {
    slug: 'react-developer',
    label: 'React Developer',
    shortLabel: 'React Dev',
    pluralLabel: 'React Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['react', 'javascript', 'typescript', 'html-css', 'rest-api'],
    searchIntent: 'navigational',
    sitemapPriority: 0.83,
    description:
      'React Developer interview questions on hooks, state management, virtual DOM, and performance optimization for Indian product companies.',
  },
  {
    slug: 'node-developer',
    label: 'Node.js Developer',
    shortLabel: 'Node Dev',
    pluralLabel: 'Node.js Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['node-js', 'javascript', 'rest-api', 'mongodb', 'sql'],
    searchIntent: 'navigational',
    sitemapPriority: 0.81,
    description:
      'Node.js Developer interview questions on async programming, Express.js, REST APIs, and database integration.',
  },
  {
    slug: 'devops-engineer',
    label: 'DevOps Engineer',
    shortLabel: 'DevOps',
    pluralLabel: 'DevOps Engineers',
    category: 'engineering',
    fresherFriendly: false,
    primarySkills: ['docker', 'kubernetes', 'aws', 'linux', 'git'],
    searchIntent: 'navigational',
    sitemapPriority: 0.81,
    description:
      'DevOps Engineer interview questions covering CI/CD, containerization, cloud infrastructure, and monitoring for Indian tech companies.',
  },
  {
    slug: 'cloud-engineer',
    label: 'Cloud Engineer',
    shortLabel: 'Cloud',
    pluralLabel: 'Cloud Engineers',
    category: 'engineering',
    fresherFriendly: false,
    primarySkills: ['aws', 'azure', 'docker', 'kubernetes', 'linux'],
    searchIntent: 'navigational',
    sitemapPriority: 0.79,
    description:
      'Cloud Engineer interview questions on AWS, Azure, GCP, infrastructure-as-code, and cloud architecture concepts.',
  },
  {
    slug: 'android-developer',
    label: 'Android Developer',
    shortLabel: 'Android Dev',
    pluralLabel: 'Android Developers',
    category: 'engineering',
    fresherFriendly: true,
    primarySkills: ['android', 'java', 'rest-api', 'sql'],
    searchIntent: 'navigational',
    sitemapPriority: 0.80,
    description:
      'Android Developer interview questions on Activity lifecycle, Kotlin/Java, Jetpack components, and REST integration.',
  },
  {
    slug: 'ios-developer',
    label: 'iOS Developer',
    shortLabel: 'iOS Dev',
    pluralLabel: 'iOS Developers',
    category: 'engineering',
    fresherFriendly: false,
    primarySkills: ['ios', 'swift', 'rest-api'],
    searchIntent: 'navigational',
    sitemapPriority: 0.76,
    description:
      'iOS Developer interview questions covering Swift, UIKit, SwiftUI, memory management, and App Store deployment.',
  },
  // ── Data ───────────────────────────────────────────────────────────────────
  {
    slug: 'data-analyst',
    label: 'Data Analyst',
    shortLabel: 'DA',
    pluralLabel: 'Data Analysts',
    category: 'data',
    fresherFriendly: true,
    primarySkills: ['sql', 'python', 'pandas', 'machine-learning', 'dbms'],
    searchIntent: 'navigational',
    sitemapPriority: 0.85,
    description:
      'Data Analyst interview questions on SQL, Python, statistics, and dashboarding tools asked at Indian analytics and tech companies.',
  },
  {
    slug: 'data-scientist',
    label: 'Data Scientist',
    shortLabel: 'DS',
    pluralLabel: 'Data Scientists',
    category: 'data',
    fresherFriendly: false,
    primarySkills: ['python', 'machine-learning', 'sql', 'pandas'],
    searchIntent: 'navigational',
    sitemapPriority: 0.82,
    description:
      'Data Scientist interview questions on ML algorithms, feature engineering, model evaluation, and statistical inference.',
  },
  {
    slug: 'machine-learning-engineer',
    label: 'Machine Learning Engineer',
    shortLabel: 'MLE',
    pluralLabel: 'ML Engineers',
    category: 'data',
    fresherFriendly: false,
    primarySkills: ['python', 'machine-learning', 'data-structures', 'algorithms'],
    searchIntent: 'navigational',
    sitemapPriority: 0.82,
    description:
      'ML Engineer interview questions on model training, deployment pipelines, MLOps, and deep learning concepts at Indian AI-first companies.',
  },
  // ── Quality ────────────────────────────────────────────────────────────────
  {
    slug: 'qa-engineer',
    label: 'QA Engineer',
    shortLabel: 'QA',
    pluralLabel: 'QA Engineers',
    category: 'quality',
    fresherFriendly: true,
    primarySkills: ['sql', 'rest-api', 'git'],
    searchIntent: 'navigational',
    sitemapPriority: 0.81,
    description:
      'QA Engineer interview questions on manual testing, test case design, automation fundamentals, and bug lifecycle.',
  },
  // ── Product & Operations ───────────────────────────────────────────────────
  {
    slug: 'product-manager',
    label: 'Product Manager',
    shortLabel: 'PM',
    pluralLabel: 'Product Managers',
    category: 'product',
    fresherFriendly: false,
    primarySkills: ['sql'],
    searchIntent: 'navigational',
    sitemapPriority: 0.80,
    description:
      'Product Manager interview questions on product sense, metrics, prioritization, and case studies asked at Indian product companies.',
  },
  {
    slug: 'business-analyst',
    label: 'Business Analyst',
    shortLabel: 'BA',
    pluralLabel: 'Business Analysts',
    category: 'operations',
    fresherFriendly: true,
    primarySkills: ['sql', 'dbms'],
    searchIntent: 'navigational',
    sitemapPriority: 0.81,
    description:
      'Business Analyst interview questions on requirements gathering, process modelling, SQL, and stakeholder management.',
  },
  {
    slug: 'system-analyst',
    label: 'System Analyst',
    shortLabel: 'SA',
    pluralLabel: 'System Analysts',
    category: 'operations',
    fresherFriendly: true,
    primarySkills: ['sql', 'dbms'],
    searchIntent: 'navigational',
    sitemapPriority: 0.72,
    description:
      'System Analyst interview questions on system requirements, process flows, stakeholder alignment, and translating business needs into technical specifications.',
  },
  // ── Design ─────────────────────────────────────────────────────────────────
  {
    slug: 'ui-ux-designer',
    label: 'UI/UX Designer',
    shortLabel: 'UX',
    pluralLabel: 'UI/UX Designers',
    category: 'design',
    fresherFriendly: true,
    primarySkills: ['html-css'],
    searchIntent: 'navigational',
    sitemapPriority: 0.77,
    description:
      'UI/UX Designer interview questions on design principles, user research, Figma, and portfolio presentation for Indian tech companies.',
  },
  // ── Security ───────────────────────────────────────────────────────────────
  {
    slug: 'cybersecurity-analyst',
    label: 'Cybersecurity Analyst',
    shortLabel: 'Cyber',
    pluralLabel: 'Cybersecurity Analysts',
    category: 'security',
    fresherFriendly: false,
    primarySkills: ['linux', 'computer-networks', 'operating-systems'],
    searchIntent: 'navigational',
    sitemapPriority: 0.77,
    description:
      'Cybersecurity Analyst interview questions on network security, threat analysis, ethical hacking, and compliance for Indian IT companies.',
  },
] as const satisfies readonly RoleDefinition[]

/**
 * Derived union type of all valid role slugs.
 * Automatically stays in sync with the ROLES array — no manual maintenance.
 *
 * Example: 'software-engineer' | 'data-analyst' | 'frontend-developer' | ...
 */
export type RoleSlug = (typeof ROLES)[number]['slug']

/**
 * Narrowest type for a single role entry — all fields are literal types.
 * Use this when you need to pass a role object through components or helpers.
 */
export type Role = (typeof ROLES)[number]

/** Total number of roles — useful for sitemap capacity planning. */
export const ROLE_COUNT = ROLES.length as number
