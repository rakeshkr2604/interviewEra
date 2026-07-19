import {
  qgQuestionSchema,
  type QgQuestion,
  type QgResultMeta,
} from '@/lib/question-engine/schemas';
import { z } from 'zod';

// v2: cards carry difficulty + probing, payload carries set meta.
// Old ie-questions-result-v1 payloads are simply ignored (different key).
export const QUESTIONS_RESULT_STORAGE_KEY = 'ie-questions-result-v2'; // gitleaks:allow — sessionStorage key name, not a credential

const storedMetaSchema = z.object({
  mode: z.enum(['role', 'jd', 'topic', 'company']),
  role: z.string().max(100),
  level: z.string().max(40),
  domain: z.string().max(60),
  // Defaulted, not required: tolerates a sessionStorage payload written by a
  // tab still open from before topic/company mode shipped.
  topic: z.string().max(80).default(''),
  company: z.string().max(60).default(''),
});

const storedPayloadSchema = z.object({
  v: z.literal(2),
  savedAt: z.number(),
  meta: storedMetaSchema,
  questions: z.array(qgQuestionSchema).min(1),
});

export interface StoredQuestionResult {
  questions: QgQuestion[];
  meta: QgResultMeta;
}

export function parseStoredQuestions(json: string): StoredQuestionResult | null {
  try {
    const parsed = storedPayloadSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    return { questions: parsed.data.questions, meta: parsed.data.meta };
  } catch {
    return null;
  }
}

export function serializeQuestions(questions: QgQuestion[], meta: QgResultMeta): string {
  return JSON.stringify({
    v: 2 as const,
    savedAt: Date.now(),
    meta,
    questions,
  });
}
