/**
 * Cross-interview novelty. A common question can still be chosen.
 * A generic question that already showed up recently loses to a
 * candidate-specific alternative. Selection stays deterministic.
 */

import { findCoreDuplicate } from './duplicate';
import { coreTopicStems } from './duplicate';
import type { QuestionPlanContext } from './types';

export interface NoveltyInput {
  questionText: string;
  context: QuestionPlanContext;
  recentQuestions: readonly string[];
  userHistory: readonly string[];
  /** Planned by other interviews but not asked yet. Penalised, not banned. */
  reservedQuestions?: readonly string[];
}

export interface NoveltyScore {
  score: number;
  recentHits: number;
  userHits: number;
  reservedHits: number;
  maxRecentSimilarity: number;
  resume: boolean;
  project: boolean;
  jd: boolean;
  role: boolean;
}

function hits(question: string, phrases: readonly string[]): boolean {
  const stems = coreTopicStems(question);
  for (const phrase of phrases) {
    const parts = coreTopicStems(phrase);
    if (parts.size === 0) continue;
    let matched = 0;
    for (const part of parts) {
      if (stems.has(part)) matched += 1;
    }
    if (matched === parts.size || (parts.size >= 2 && matched >= 2) || (parts.size === 1 && matched === 1)) {
      return true;
    }
  }
  return false;
}

function countMatches(question: string, corpus: readonly string[]): { hits: number; maxScore: number } {
  let hits = 0;
  let maxScore = 0;
  for (const previous of corpus) {
    const match = findCoreDuplicate(question, [previous]);
    if (match.duplicate) hits += 1;
    if (match.score > maxScore) maxScore = match.score;
  }
  return { hits, maxScore };
}

export function scoreQuestionNovelty(input: NoveltyInput): NoveltyScore {
  const project = hits(input.questionText, input.context.projects);
  const resume = project || hits(input.questionText, input.context.skills);
  const jd = hits(input.questionText, input.context.jobDescription ? [input.context.jobDescription] : []);
  const role = hits(input.questionText, input.context.role ? [input.context.role] : []);
  const recent = countMatches(input.questionText, input.recentQuestions);
  const history = countMatches(input.questionText, input.userHistory);
  const reserved = countMatches(input.questionText, input.reservedQuestions ?? []);

  let score = 0;
  if (project) score += 0.35;
  if (resume) score += 0.25;
  if (jd) score += 0.2;
  if (role) score += 0.1;
  score -= Math.min(0.45, recent.hits * 0.15);
  score -= Math.min(0.5, history.hits * 0.25);
  score -= Math.min(0.36, reserved.hits * 0.12);
  score -= recent.maxScore >= 0.72 ? recent.maxScore * 0.35 : 0;

  return {
    score: Math.round(score * 10000) / 10000,
    recentHits: recent.hits,
    userHits: history.hits,
    reservedHits: reserved.hits,
    maxRecentSimilarity: recent.maxScore,
    resume,
    project,
    jd,
    role,
  };
}

/** Most repeated recent strings, deterministic, for the generation prompt. */
export function frequentRecentQuestions(recent: readonly string[], limit = 8): string[] {
  const counts = new Map<string, { text: string; count: number }>();
  for (const question of recent) {
    const key = question.trim().toLowerCase();
    if (!key) continue;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { text: question.trim(), count: 1 });
  }
  return [...counts.values()]
    .filter((row) => row.count >= 2)
    .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))
    .slice(0, limit)
    .map((row) => row.text);
}
