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
  };
}
