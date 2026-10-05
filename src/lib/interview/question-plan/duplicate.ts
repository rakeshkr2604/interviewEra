/**
 * Core-question duplicate detection.
 *
 * Follow-ups are not decided here. Callers must skip this check when
 * is_follow_up is true — a deeper probe on the parent is not a new core.
 *
 * Level 1: normalized exact text (case, punctuation, leading bridges).
 * Level 2: questionsAreEquivalent + existing Jaccard dedupe.
 * Level 3: same assessment target (stack/heap, index mechanism, …).
 */

import { questionsAreEquivalent, comparableQuestionText } from '@/lib/ai/scripts/follow-up-guards';
import { questionSimilarity } from '@/lib/interview/deduplicate-questions';
import { significantQuestionTokens } from '@/lib/ai/scripts/speech-display-question';

const LEXICAL_THRESHOLD = 0.72;
const TOPIC_OVERLAP = 0.8;
const BRIDGE_SUFFIX_MIN = 20;

/** Leading interviewer bridges, already punctuation-stripped and lowercased. */
const LEADING_BRIDGES = [
  'lets switch direction a bit i want to understand the team side of your work',
  'lets switch direction a bit',
  'i want to understand the team side of your work',
  'good back to the technical side now',
  'back to the technical side now',
  'alright lets dig into the interview questions',
  'thanks lets keep going',
  'lets go deeper',
  'let us go deeper',
  'lets keep going',
  'before we move on',
  'quick background first',
].sort((a, b) => b.length - a.length);

/**
 * Scaffolding that describes the interview move, not the thing being assessed.
 * Topic overlap uses what remains.
 */
const TOPIC_SCAFFOLD = new Set([
  'actually',
  'adding',
  'approach',
  'concrete',
  'currently',
  'differ',
  'difference',
  'differs',
  'does',
  'either',
  'exhausted',
  'explain',
  'genuine',
  'happens',
  'help',
  'hurt',
  'improve',
  'improved',
  'internally',
  'outcome',
  'performance',
  'personally',
  'rather',
  'really',
  'situation',
  'someone',
  'something',
  'specifically',
  'taking',
  'used',
  'using',
  'work',
]);

export type CoreDuplicateKind = 'exact' | 'lexical' | 'same_topic';

export interface CoreDuplicateMatch {
  duplicate: boolean;
  kind: CoreDuplicateKind | null;
  score: number;
  matched?: string;
}

export function normalizeCoreQuestion(text: string): string {
  let normalized = comparableQuestionText(text);
  let stripped = true;
  while (stripped && normalized) {
    stripped = false;
    for (const bridge of LEADING_BRIDGES) {
      if (normalized === bridge) {
        normalized = '';
        stripped = true;
        break;
      }
      if (normalized.startsWith(`${bridge} `)) {
        normalized = normalized.slice(bridge.length).trim();
        stripped = true;
        break;
      }
    }
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

const STEM_ALIASES: Record<string, string> = {
  authentication: 'auth',
  authenticated: 'auth',
  indexing: 'index',
  indices: 'index',
};

/** Same competency asked with different words. A one-sided narrow probe is a follow-up. */
const CONCEPT_FAMILIES: readonly string[][] = [
  ['auth', 'session', 'login', 'credential', 'password', 'signin'],
  ['index'],
];

const NARROW_PROBE = new Set([
  'bcrypt',
  'cookie',
  'csrf',
  'expiry',
  'expire',
  'flag',
  'header',
  'httponly',
  'latency',
  'lock',
  'refresh',
  'revocation',
  'revoke',
  'rotate',
  'rotation',
  'salt',
  'samesite',
  'timeout',
  'write',
]);

function stemToken(token: string): string {
  let stem = token;
  if (stem.endsWith('ies') && stem.length > 4) stem = `${stem.slice(0, -3)}y`;
  else if (stem.endsWith('es') && stem.length > 4) stem = stem.slice(0, -2);
  else if (stem.endsWith('s') && !stem.endsWith('ss') && stem.length > 4) stem = stem.slice(0, -1);
  return STEM_ALIASES[stem] ?? stem;
}

export function coreTopicStems(text: string): Set<string> {
  const stems = new Set<string>();
  for (const token of significantQuestionTokens(text)) {
    const stem = stemToken(token);
    if (stem.length < 4 || TOPIC_SCAFFOLD.has(stem) || TOPIC_SCAFFOLD.has(token)) continue;
    stems.add(stem);
  }
  return stems;
}

function exactNormalizedDuplicate(a: string, b: string): boolean {
  const left = normalizeCoreQuestion(a);
  const right = normalizeCoreQuestion(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < BRIDGE_SUFFIX_MIN) return false;
  return longer.endsWith(` ${shorter}`);
}

function sameConceptFamily(a: string, b: string): boolean {
  const left = coreTopicStems(a);
  const right = coreTopicStems(b);
  for (const family of CONCEPT_FAMILIES) {
    const names = new Set(family);
    const leftHits = [...left].filter((stem) => names.has(stem)).length;
    const rightHits = [...right].filter((stem) => names.has(stem)).length;
    if (leftHits === 0 || rightHits === 0) continue;
    const leftNarrow = [...left].some((stem) => NARROW_PROBE.has(stem));
    const rightNarrow = [...right].some((stem) => NARROW_PROBE.has(stem));
    if (leftNarrow || rightNarrow) continue;
    return true;
  }
  return false;
}

function sameTopic(a: string, b: string): { duplicate: boolean; score: number } {
  const left = coreTopicStems(a);
  const right = coreTopicStems(b);
  if (left.size < 2 || right.size < 2) return { duplicate: false, score: 0 };
  let intersection = 0;
  for (const stem of left) {
    if (right.has(stem)) intersection += 1;
  }
  const smaller = Math.min(left.size, right.size);
  const score = intersection / smaller;
  return {
    duplicate: intersection >= 2 && score >= TOPIC_OVERLAP,
    score,
  };
}

export function classifyCoreDuplicate(a: string, b: string): CoreDuplicateMatch {
  if (exactNormalizedDuplicate(a, b) || questionsAreEquivalent(a, b)) {
    return { duplicate: true, kind: 'exact', score: 1 };
  }
  const lexical = questionSimilarity(a, b);
  if (lexical >= LEXICAL_THRESHOLD) {
    return { duplicate: true, kind: 'lexical', score: lexical };
  }
  const topic = sameTopic(a, b);
  if (topic.duplicate) {
    return { duplicate: true, kind: 'same_topic', score: topic.score };
  }
  if (sameConceptFamily(a, b)) {
    return { duplicate: true, kind: 'same_topic', score: 0.8 };
  }
  return { duplicate: false, kind: null, score: lexical };
}

export function findCoreDuplicate(
  candidate: string,
  prior: readonly string[],
): CoreDuplicateMatch {
  let best: CoreDuplicateMatch = { duplicate: false, kind: null, score: 0 };
  for (const previous of prior) {
    if (!previous.trim()) continue;
    const match = classifyCoreDuplicate(candidate, previous);
    if (!match.duplicate) continue;
    if (!best.duplicate || match.score > best.score) {
      best = { ...match, matched: previous };
    }
  }
  return best;
}
