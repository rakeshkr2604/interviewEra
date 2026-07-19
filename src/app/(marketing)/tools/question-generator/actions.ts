'use server';

import { headers } from 'next/headers';
import { isOpenRouterConfigured } from '@/lib/openrouter/client';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import { generateQgSet } from '@/lib/question-engine/generate';
import {
  buildQgSetCacheKey,
  getCachedQgSet,
  setCachedQgSet,
} from '@/lib/question-engine/cache';
import {
  QG_JD_MAX_CHARS,
  type QgMode,
  type QgQuestion,
  type QgResultMeta,
} from '@/lib/question-engine/schemas';

export interface GenerateResult {
  questions?: QgQuestion[];
  meta?: QgResultMeta;
  cached?: boolean;
  error?: string;
}

const LEVELS = new Set(['fresher', '1-3 years', '3+ years']);
const DOMAINS = new Set([
  'general',
  'software engineering',
  'product management',
  'data science',
  'marketing',
]);

const JD_MIN_CHARS = 40;

const FRIENDLY_LLM_ERROR =
  'Question generation failed (quota, rate limit, or network). Wait a moment and try again.';
const FRIENDLY_INVALID_ERROR =
  'The AI returned an unexpected format twice in a row. Please try again in a moment.';

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  );
}

export async function generateQuestionsAction(
  _prevState: GenerateResult,
  formData: FormData,
): Promise<GenerateResult> {
  const rawMode = (formData.get('mode') as string | null)?.trim() ?? 'role';
  const mode: QgMode = rawMode === 'jd' ? 'jd' : 'role';
  const role = (formData.get('role') as string | null)?.trim() ?? '';
  const rawLevel = (formData.get('level') as string | null)?.trim() ?? 'fresher';
  const rawDomain = (formData.get('domain') as string | null)?.trim() ?? 'general';
  const jd = (formData.get('jd') as string | null)?.trim() ?? '';

  const level = LEVELS.has(rawLevel) ? rawLevel : 'fresher';
  const domain = DOMAINS.has(rawDomain) ? rawDomain : 'general';

  if (mode === 'role') {
    if (!role || role.length < 2 || role.length > 100) {
      return { error: 'Please enter a valid role (2–100 characters).' };
    }
  } else {
    if (jd.length < JD_MIN_CHARS) {
      return { error: 'Please paste a job description (at least 40 characters).' };
    }
    if (jd.length > QG_JD_MAX_CHARS) {
      return { error: 'Job description is too long (4,000 character max). Trim it and try again.' };
    }
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);

  const limited = await checkAndConsumeFreeToolLimit('question-generator', ip, {
    failClosed: false,
  });
  if (!limited.ok) {
    return { error: limited.message };
  }

  const meta: QgResultMeta = {
    mode,
    role: mode === 'role' ? role : '',
    level,
    domain: mode === 'role' ? domain : 'general',
  };

  // Redis cache — role mode only. JD sets are never cached (decision D6).
  const cacheKey =
    mode === 'role' ? buildQgSetCacheKey({ mode: 'role', role, level, domain }) : null;
  if (cacheKey) {
    const cachedQuestions = await getCachedQgSet(cacheKey);
    if (cachedQuestions) {
      return { questions: cachedQuestions, meta, cached: true };
    }
  }

  if (!isOpenRouterConfigured()) {
    return {
      error: 'AI is not configured. Set OPENROUTER_API_KEY, then try again.',
    };
  }

  const result = await generateQgSet({
    mode,
    role,
    level,
    domain,
    jobDescription: mode === 'jd' ? jd : undefined,
  });

  if (!result.ok) {
    return {
      error: result.reason === 'invalid_output' ? FRIENDLY_INVALID_ERROR : FRIENDLY_LLM_ERROR,
    };
  }

  if (cacheKey) {
    await setCachedQgSet(cacheKey, result.questions);
  }

  return { questions: result.questions, meta, cached: false };
}
