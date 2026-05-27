/**
 * Deterministic role-aware question sets when AI generation fails.
 */

import type { InterviewDifficulty, QuestionCategory } from '@/types/app.types';

export type FallbackQuestion = {
  order: number;
  question_text: string;
  category: QuestionCategory;
  rubric: { focus: string; strong_answer: string };
};

const BASE_RUBRIC = {
  focus: 'Clarity, structure, and relevant examples',
  strong_answer: 'Uses a clear framework (context → action → result) with specific details',
};

function pickPool(role: string): keyof typeof POOLS {
  const r = role.toLowerCase();
  if (/data|ml|machine learning|analyst/.test(r)) return 'data';
  if (/frontend|front-end|react|ui\b/.test(r)) return 'frontend';
  if (/backend|back-end|api|node|java\b|spring/.test(r)) return 'backend';
  if (/full[\s-]?stack|software engineer|sde|developer/.test(r)) return 'fullstack';
  if (/product|pm\b/.test(r)) return 'product';
  if (/hr|recruiter|behavioral/.test(r)) return 'hr';
  return 'general';
}

const POOLS = {
  general: [
    { q: 'Walk me through a project you are proud of and your specific contribution.', c: 'behavioral' as const },
    { q: 'How do you approach debugging when production behavior differs from expectations?', c: 'technical' as const },
    { q: 'Describe a time you had to learn a new technology quickly for a deadline.', c: 'situational' as const },
    { q: 'How do you prioritize tasks when multiple stakeholders have conflicting asks?', c: 'behavioral' as const },
    { q: 'Explain a technical decision you made and the trade-offs you considered.', c: 'technical' as const },
    { q: 'Tell me about a mistake you made at work and what you changed afterward.', c: 'behavioral' as const },
    { q: 'How would you design a simple system to handle 10× traffic growth?', c: 'technical' as const },
    { q: 'Describe how you communicate progress to non-technical teammates.', c: 'situational' as const },
  ],
  fullstack: [
    { q: 'Design a REST API for a job application tracker — resources, auth, and error handling.', c: 'technical' as const },
    { q: 'How do you keep frontend state in sync with backend updates?', c: 'technical' as const },
    { q: 'Walk through database indexing choices for a high-read listing page.', c: 'technical' as const },
    { q: 'Describe a full-stack feature you shipped end-to-end.', c: 'behavioral' as const },
    { q: 'How would you handle authentication and session security in a web app?', c: 'technical' as const },
    { q: 'Tell me about a performance issue you fixed across the stack.', c: 'situational' as const },
  ],
  backend: [
    { q: 'Explain idempotency and where it matters in API design.', c: 'technical' as const },
    { q: 'How would you model retries and dead-letter queues for async jobs?', c: 'technical' as const },
    { q: 'Describe schema migration strategy for a live PostgreSQL service.', c: 'technical' as const },
    { q: 'Walk through caching layers you have used and cache invalidation pitfalls.', c: 'technical' as const },
    { q: 'How do you observe and alert on production backend health?', c: 'situational' as const },
  ],
  frontend: [
    { q: 'How do you manage component state vs server state in React?', c: 'technical' as const },
    { q: 'Describe accessibility checks you perform before shipping UI.', c: 'technical' as const },
    { q: 'How would you improve Largest Contentful Paint on a dashboard?', c: 'technical' as const },
    { q: 'Tell me about a complex UI bug and how you isolated it.', c: 'behavioral' as const },
  ],
  data: [
    { q: 'How do you validate data quality before training or reporting?', c: 'technical' as const },
    { q: 'Explain bias and leakage risks in a predictive model project.', c: 'technical' as const },
    { q: 'Describe a metric you defined and how it changed product decisions.', c: 'behavioral' as const },
    { q: 'How would you explain model results to a non-technical stakeholder?', c: 'situational' as const },
  ],
  product: [
    { q: 'How do you prioritize a backlog when engineering capacity is fixed?', c: 'situational' as const },
    { q: 'Describe a product decision backed by user research or data.', c: 'behavioral' as const },
    { q: 'Walk through a PRD outline for a small feature improvement.', c: 'technical' as const },
  ],
  hr: [
    { q: 'Tell me about a conflict you resolved on a team.', c: 'behavioral' as const },
    { q: 'Describe your strengths with a recent example for each.', c: 'behavioral' as const },
    { q: 'Where do you see yourself in two years and why this role?', c: 'situational' as const },
    { q: 'How do you handle feedback you disagree with?', c: 'behavioral' as const },
  ],
};

function difficultyPrefix(difficulty: InterviewDifficulty): string {
  if (difficulty === 'easy') return '[Warm-up] ';
  if (difficulty === 'hard') return '[Deep dive] ';
  return '';
}

export function buildFallbackQuestions(
  role: string,
  difficulty: InterviewDifficulty,
  count: number,
): FallbackQuestion[] {
  const pool = POOLS[pickPool(role)];
  const prefix = difficultyPrefix(difficulty);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));

  while (picked.length < count) {
    picked.push(pool[picked.length % pool.length]);
  }

  return picked.map((item, idx) => ({
    order: idx,
    question_text: `${prefix}${item.q}`,
    category: item.c,
    rubric: BASE_RUBRIC,
  }));
}
