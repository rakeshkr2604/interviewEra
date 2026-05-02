import type { GeneratedQuestion } from './actions';

export const QUESTIONS_RESULT_STORAGE_KEY = 'ie-questions-result-v1';

type StoredPayload = {
  v: 1;
  savedAt: number;
  questions: GeneratedQuestion[];
};

const CATEGORIES = new Set(['technical', 'behavioral', 'situational']);

function isQuestion(x: unknown): x is GeneratedQuestion {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (typeof o.order !== 'number' || !Number.isFinite(o.order)) return false;
  if (typeof o.question_text !== 'string' || !String(o.question_text).trim()) return false;
  const cat = o.category;
  if (typeof cat !== 'string' || !CATEGORIES.has(cat)) return false;
  return true;
}

export function parseStoredQuestions(json: string): GeneratedQuestion[] | null {
  try {
    const data = JSON.parse(json) as StoredPayload;
    if (data?.v !== 1 || !Array.isArray(data.questions) || data.questions.length === 0) return null;
    if (!data.questions.every(isQuestion)) return null;
    return data.questions.map((q) => ({
      order: Math.round(q.order),
      question_text: String(q.question_text).trim(),
      category: q.category as GeneratedQuestion['category'],
    }));
  } catch {
    return null;
  }
}

export function serializeQuestions(questions: GeneratedQuestion[]): string {
  const payload: StoredPayload = {
    v: 1,
    savedAt: Date.now(),
    questions,
  };
  return JSON.stringify(payload);
}
