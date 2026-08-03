/**
 * Lightweight skill normalization for JD ↔ resume overlap.
 *
 * Why a small hardcoded map (not Lightcast/ESCO):
 * - Campus / India tech hiring is dominated by a few dozen tool names with
 *   predictable aliases (JS/JavaScript, Node/Node.js, k8s/Kubernetes).
 * - Full taxonomies add licensing + ops without MVP value.
 * - Case-fold + punctuation strip + alias map is enough to stop obvious misses
 *   while exact string equality still handles uncommon skills.
 */

/** Canonical form → aliases (aliases map TO the canonical key). */
const ALIAS_GROUPS: ReadonlyArray<readonly [canonical: string, aliases: readonly string[]]> = [
  ['javascript', ['js', 'ecmascript', 'es6', 'es2015']],
  ['typescript', ['ts']],
  ['nodejs', ['node', 'node.js', 'node js']],
  ['react', ['reactjs', 'react.js']],
  ['nextjs', ['next', 'next.js', 'next js']],
  ['vue', ['vuejs', 'vue.js']],
  ['angular', ['angularjs']],
  ['postgresql', ['postgres', 'psql', 'postgre sql']],
  ['mongodb', ['mongo']],
  ['mysql', ['my sql']],
  ['kubernetes', ['k8s']],
  ['docker', ['containers', 'containerization']],
  ['aws', ['amazon web services']],
  ['gcp', ['google cloud', 'google cloud platform']],
  ['azure', ['microsoft azure']],
  ['ci/cd', ['cicd', 'ci cd', 'continuous integration', 'continuous delivery']],
  ['machine learning', ['ml']],
  ['artificial intelligence', ['ai']],
  ['natural language processing', ['nlp']],
  ['rest', ['rest api', 'restful', 'rest apis']],
  ['graphql', ['graph ql']],
  ['tailwindcss', ['tailwind', 'tailwind css']],
  ['express', ['expressjs', 'express.js']],
  ['fastapi', ['fast api']],
  ['redis', ['redis cache']],
  ['elasticsearch', ['elastic search', 'opensearch']],
  ['html', ['html5']],
  ['css', ['css3']],
  ['java', ['core java']],
  ['csharp', ['c#', 'c sharp']],
  ['cplusplus', ['c++', 'cpp']],
  ['golang', ['go', 'go lang']],
  ['python', ['py']],
  ['supabase', []],
  ['vercel', []],
  ['openai', ['open ai', 'gpt', 'chatgpt']],
  ['prisma', ['prisma orm']],
  ['integration testing', ['integration tests', 'integration test']],
  ['unit testing', ['unit tests', 'unit test']],
  ['regression testing', ['regression tests', 'regression test', 'regression suites', 'regression suite']],
  ['e2e testing', ['end to end testing', 'e2e tests', 'e2e test', 'e2e']],
];

const ALIAS_TO_CANONICAL = (() => {
  const map = new Map<string, string>();
  for (const [canonical, aliases] of ALIAS_GROUPS) {
    map.set(canonical, canonical);
    for (const a of aliases) {
      map.set(normalizeKey(a), canonical);
    }
  }
  return map;
})();

/**
 * Umbrella categories: a JD asking for "programming" / "one coding language"
 * is satisfied by any concrete member skill on the resume. Members are
 * canonical keys (post-canonicalizeSkill). Kept small and obvious — this is
 * category satisfaction, not a taxonomy.
 */
const CATEGORY_GROUPS: ReadonlyArray<
  readonly [category: string, aliases: readonly string[], members: readonly string[]]
> = [
  [
    'programming',
    [
      'coding',
      'programming language',
      'programming languages',
      'coding language',
      'coding languages',
      'any programming language',
      'one programming language',
      'software development',
    ],
    [
      'python', 'java', 'javascript', 'typescript', 'cplusplus', 'csharp',
      'golang', 'ruby', 'php', 'kotlin', 'swift', 'rust', 'scala', 'c', 'dart', 'r',
    ],
  ],
  [
    'databases',
    ['database', 'sql databases', 'relational databases', 'nosql databases'],
    ['sql', 'postgresql', 'mysql', 'mongodb', 'oracle', 'sqlite', 'redis', 'elasticsearch', 'dynamodb', 'cassandra'],
  ],
  [
    'cloud',
    ['cloud platforms', 'cloud computing', 'cloud services', 'public cloud'],
    ['aws', 'gcp', 'azure'],
  ],
  [
    'version control',
    ['source control', 'version control systems'],
    ['git', 'github', 'gitlab', 'bitbucket'],
  ],
];

const CATEGORY_ALIAS_TO_KEY = (() => {
  const map = new Map<string, string>();
  for (const [category, aliases] of CATEGORY_GROUPS) {
    map.set(category, category);
    for (const a of aliases) map.set(a, category);
  }
  return map;
})();

const CATEGORY_MEMBERS = new Map(CATEGORY_GROUPS.map(([c, , members]) => [c, members]));

export function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9+#./]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Map a free-form skill string to a canonical comparison key. */
export function canonicalizeSkill(raw: string): string {
  const key = normalizeKey(raw);
  if (!key) return '';
  if (ALIAS_TO_CANONICAL.has(key)) return ALIAS_TO_CANONICAL.get(key)!;
  if (CATEGORY_ALIAS_TO_KEY.has(key)) return CATEGORY_ALIAS_TO_KEY.get(key)!;
  // Also try without spaces/dots (node.js → nodejs)
  const compact = key.replace(/[.\s]/g, '');
  if (ALIAS_TO_CANONICAL.has(compact)) return ALIAS_TO_CANONICAL.get(compact)!;
  return key;
}

export function canonicalizeSkillList(skills: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of skills) {
    const c = canonicalizeSkill(s);
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}

/**
 * Taxonomy terms too ambiguous to detect in free prose (common English words
 * or single letters) — only trusted when explicitly listed as a skill.
 */
const TEXT_SCAN_EXCLUDED: ReadonlySet<string> = new Set([
  'go', 'r', 'c', 'rest', 'express', 'next', 'ml', 'ai', 'py', 'ts', 'js',
  'containers', 'message', 'gpt', 'dart',
]);

/** All scannable (term → canonical) pairs: skill aliases + category members. */
const TEXT_SCAN_TERMS: ReadonlyArray<readonly [term: string, canonical: string]> = (() => {
  const pairs: Array<readonly [string, string]> = [];
  for (const [canonical, aliases] of ALIAS_GROUPS) {
    for (const term of [canonical, ...aliases.map(normalizeKey)]) {
      if (term && !TEXT_SCAN_EXCLUDED.has(term)) pairs.push([term, canonical]);
    }
  }
  for (const [, , members] of CATEGORY_GROUPS) {
    for (const m of members) {
      if (!TEXT_SCAN_EXCLUDED.has(m) && !pairs.some(([t]) => t === m)) {
        pairs.push([m, m]);
      }
    }
  }
  return pairs;
})();

/**
 * Scan free resume text (experience bullets, projects, summary) for taxonomy
 * skill mentions the candidate did NOT list in their skills section.
 *
 * Whole-word matching on normalized text (space-padded containment, so `+`/`#`
 * terms like "c++" work where regex \b does not). Deterministic — no LLM call.
 * Returns canonical keys, deduped, excluding anything already covered by
 * `declaredSkills`.
 */
export function inferSkillsFromText(
  text: string,
  declaredSkills: readonly string[],
): string[] {
  if (!text.trim()) return [];
  const declared = new Set(canonicalizeSkillList(declaredSkills));
  // Sentence-ending periods ("...with PostgreSQL.") aren't part of a dotted
  // term (like "Node.js") — normalizeKey preserves `.` for the latter, so
  // strip only periods followed by whitespace/end before padding for
  // whole-word matching. "Node.js and" still degrades to "node js and",
  // which the alias map already covers (`node.js` / `node js` both map to
  // `nodejs`).
  const haystack = ` ${normalizeKey(text.replace(/\.(?=\s|$)/g, ' '))} `;
  const found: string[] = [];
  const seen = new Set<string>();
  for (const [term, canonical] of TEXT_SCAN_TERMS) {
    if (seen.has(canonical) || declared.has(canonical)) continue;
    if (haystack.includes(` ${term} `)) {
      seen.add(canonical);
      found.push(canonical);
    }
  }
  return found;
}

/**
 * Exact/normalized overlap between resume skills and a JD skill list.
 * A JD skill matches if any resume skill shares the same canonical key,
 * or either string contains the other after normalization (substring guard
 * for phrases like "react.js hooks" vs "react").
 */
export function matchSkillLists(
  resumeSkills: readonly string[],
  jdSkills: readonly string[],
): {
  matched: string[];
  missing: string[];
  coverage: number; // 0–1
  /**
   * True when the JD side produced zero comparable skills. Coverage defaults
   * to 1 in that case ("nothing required, nothing missing") — callers that got
   * an empty list from a FAILED extraction must check this flag and not treat
   * the 1 as a real match signal.
   */
  isEmpty: boolean;
} {
  const resumeCanon = canonicalizeSkillList(resumeSkills);
  const resumeSet = new Set(resumeCanon);

  const matched: string[] = [];
  const missing: string[] = [];
  const seenJd = new Set<string>();

  for (const jd of jdSkills) {
    const c = canonicalizeSkill(jd);
    if (!c || seenJd.has(c)) continue;
    seenJd.add(c);
    let hit = resumeSet.has(c);
    if (!hit) {
      // Umbrella category ("programming", "databases") satisfied by any
      // concrete member skill on the resume.
      const category = CATEGORY_ALIAS_TO_KEY.get(c);
      if (category) {
        hit = (CATEGORY_MEMBERS.get(category) ?? []).some((m) => resumeSet.has(m));
      }
    }
    if (!hit) {
      hit = resumeCanon.some((r) => r.includes(c) || c.includes(r));
    }
    if (hit) matched.push(c);
    else missing.push(c);
  }

  const denom = matched.length + missing.length;
  return {
    matched,
    missing,
    coverage: denom === 0 ? 1 : matched.length / denom,
    isEmpty: denom === 0,
  };
}
