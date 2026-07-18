/**
 * Deterministic skill normalization for interview context.
 * Alias map is the maintainable source of truth — not an LLM call.
 */

export type ExtractedSkill = {
  raw: string;
  canonical: string;
};

/** Lowercase key → display canonical form. */
const SKILL_ALIASES: Record<string, string> = {
  // React family
  react: 'React',
  'react.js': 'React',
  reactjs: 'React',
  'react js': 'React',
  'reactjs 18': 'React',
  'react 18': 'React',
  'react18': 'React',
  // Node
  node: 'Node.js',
  nodejs: 'Node.js',
  'node.js': 'Node.js',
  'node js': 'Node.js',
  // JS / TS
  js: 'JavaScript',
  javascript: 'JavaScript',
  'java script': 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  'type script': 'TypeScript',
  // Python
  python: 'Python',
  python3: 'Python',
  'python 3': 'Python',
  // Java / Go / C#
  java: 'Java',
  golang: 'Go',
  go: 'Go',
  'c#': 'C#',
  csharp: 'C#',
  'c sharp': 'C#',
  // Web
  html: 'HTML',
  html5: 'HTML',
  css: 'CSS',
  css3: 'CSS',
  next: 'Next.js',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  'next js': 'Next.js',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',
  angular: 'Angular',
  angularjs: 'Angular',
  // Backend / data
  express: 'Express',
  expressjs: 'Express',
  'express.js': 'Express',
  nest: 'NestJS',
  nestjs: 'NestJS',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  'fast api': 'FastAPI',
  spring: 'Spring',
  'spring boot': 'Spring Boot',
  springboot: 'Spring Boot',
  // Databases
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  'postgres sql': 'PostgreSQL',
  mysql: 'MySQL',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  redis: 'Redis',
  sqlite: 'SQLite',
  // Cloud / devops
  aws: 'AWS',
  'amazon web services': 'AWS',
  gcp: 'GCP',
  'google cloud': 'GCP',
  azure: 'Azure',
  docker: 'Docker',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  // Mobile
  'react native': 'React Native',
  reactnative: 'React Native',
  flutter: 'Flutter',
  android: 'Android',
  ios: 'iOS',
  swift: 'Swift',
  kotlin: 'Kotlin',
  // Misc common / brand casing (avoid title-case flattening: Css, Openai, Api, …)
  graphql: 'GraphQL',
  rest: 'REST API',
  'rest api': 'REST API',
  'rest apis': 'REST API',
  sql: 'SQL',
  nosql: 'NoSQL',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  'scikit-learn': 'scikit-learn',
  sklearn: 'scikit-learn',
  pandas: 'Pandas',
  numpy: 'NumPy',
  linux: 'Linux',
  bash: 'Bash',
  powershell: 'PowerShell',
  // CSS / UI
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  'tailwind css': 'Tailwind CSS',
  'tailwindcss css': 'Tailwind CSS',
  // AI / APIs
  openai: 'OpenAI',
  'openai api': 'OpenAI API',
  'openai apis': 'OpenAI API',
  openapi: 'OpenAPI',
  // Already covered above but keep explicit brand forms for scan completeness
  // github → GitHub, mongodb → MongoDB, postgresql → PostgreSQL, mysql → MySQL,
  // node.js → Node.js, next.js → Next.js, typescript → TypeScript, javascript → JavaScript
  'ci cd': 'CI/CD',
  cicd: 'CI/CD',
  'c i c d': 'CI/CD',
  // Acronyms / CS terms (title-case flattens these to Api, Oop, Jwt, …)
  api: 'API',
  apis: 'API',
  sdk: 'SDK',
  orm: 'ORM',
  jwt: 'JWT',
  oop: 'OOP',
  dsa: 'DSA',
  dbms: 'DBMS',
  grpc: 'gRPC',
  'g rpc': 'gRPC',
  ml: 'ML',
  ai: 'AI',
  ui: 'UI',
  ux: 'UX',
  nlp: 'NLP',
};

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w.\s#+-]/g, '')
    .trim();
}

/** Title-case fallback when no alias matches. */
function fallbackCanonical(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  // Preserve known casing patterns like Node.js if user already used them
  if (/^[A-Z0-9.+#-]+$/i.test(trimmed) && trimmed.includes('.')) {
    return trimmed
      .split('.')
      .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1).toLowerCase() : ''))
      .join('.');
  }
  return trimmed
    .split(' ')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

export function canonicalizeSkill(raw: string): string {
  const key = normalizeKey(raw);
  if (!key) return '';
  if (SKILL_ALIASES[key]) return SKILL_ALIASES[key]!;
  // Strip trailing version tokens: "react 18", "python 3.11"
  const withoutVersion = key.replace(/\s+\d+(\.\d+)*$/u, '').trim();
  if (withoutVersion && SKILL_ALIASES[withoutVersion]) {
    return SKILL_ALIASES[withoutVersion]!;
  }
  return fallbackCanonical(raw);
}

/**
 * Normalize a skill list: alias → canonical, de-dupe by canonical (case-insensitive).
 * Preserves first-seen raw string per canonical.
 */
export function canonicalizeSkills(rawSkills: string[]): ExtractedSkill[] {
  const seen = new Set<string>();
  const out: ExtractedSkill[] = [];
  for (const raw of rawSkills) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim().slice(0, 64);
    if (!trimmed || trimmed.length < 2) continue;
    const canonical = canonicalizeSkill(trimmed);
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ raw: trimmed, canonical });
    if (out.length >= 24) break;
  }
  return out;
}

/** Canonical display strings for interview context / ParsedResume.skills. */
export function canonicalSkillNames(rawSkills: string[]): string[] {
  return canonicalizeSkills(rawSkills).map((s) => s.canonical);
}
