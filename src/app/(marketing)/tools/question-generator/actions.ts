'use server';

import { headers } from 'next/headers';
import { isOpenRouterConfigured } from '@/lib/openrouter/client';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import {
  clientIpFromHeaders,
  requireFreeToolUser,
  type FreeToolAuthErrorCode,
} from '@/lib/security/free-tool-access';
import { recordFreeToolCompleted } from '@/lib/analytics/free-tool-events';
import { logToolUsage } from '@/lib/telemetry/tool-usage-logger';
import { generateQgSet } from '@/lib/question-engine/generate';
import {
  buildQgSetCacheKey,
  getCachedQgSet,
  setCachedQgSet,
} from '@/lib/question-engine/cache';
import {
  QG_COMPANY_MAX_CHARS,
  QG_DOMAINS,
  QG_JD_MAX_CHARS,
  QG_LEVELS,
  QG_TOPIC_MAX_CHARS,
  type QgMode,
  type QgQuestion,
  type QgResultMeta,
} from '@/lib/question-engine/schemas';
import { validateJobDescriptionDocumentText } from '@/lib/documents/validate-resume-document-text';

export interface GenerateResult {
  questions?: QgQuestion[];
  meta?: QgResultMeta;
  cached?: boolean;
  error?: string;
  code?: FreeToolAuthErrorCode | 'RATE_LIMITED' | 'RATE_LIMIT_UNAVAILABLE';
}

const LEVELS = new Set<string>(QG_LEVELS);
const DOMAINS = new Set<string>(QG_DOMAINS);

const JD_MIN_CHARS = 40;
const TOPIC_MIN_CHARS = 2;
const COMPANY_MIN_CHARS = 2;

const FRIENDLY_LLM_ERROR =
  'Question generation failed (quota, rate limit, or network). Wait a moment and try again.';
const FRIENDLY_INVALID_ERROR =
  'The AI returned an unexpected format twice in a row. Please try again in a moment.';

export async function generateQuestionsAction(
  _prevState: GenerateResult,
  formData: FormData,
): Promise<GenerateResult> {
  const access = await requireFreeToolUser();
  if (!access.ok) {
    return { error: access.message, code: access.code };
  }

  const rawMode = (formData.get('mode') as string | null)?.trim() ?? 'role';
  const mode: QgMode =
    rawMode === 'jd' || rawMode === 'topic' || rawMode === 'company' ? rawMode : 'role';
  const role = (formData.get('role') as string | null)?.trim() ?? '';
  const rawLevel = (formData.get('level') as string | null)?.trim() ?? 'fresher';
  const rawDomain = (formData.get('domain') as string | null)?.trim() ?? 'general';
  const jd = (formData.get('jd') as string | null)?.trim() ?? '';
  const topic = (formData.get('topic') as string | null)?.trim() ?? '';
  const company = (formData.get('company') as string | null)?.trim() ?? '';

  const level = LEVELS.has(rawLevel) ? rawLevel : 'fresher';
  const domain = DOMAINS.has(rawDomain) ? rawDomain : 'general';

  if (mode === 'role') {
    if (!role || role.length < 2 || role.length > 100) {
      return { error: 'Please enter a valid role (2–100 characters).' };
    }
  } else if (mode === 'jd') {
    if (jd.length < JD_MIN_CHARS) {
      return { error: 'Please paste a job description (at least 40 characters).' };
    }
    if (jd.length > QG_JD_MAX_CHARS) {
      return { error: 'Job description is too long (4,000 character max). Trim it and try again.' };
    }
    const jdDoc = validateJobDescriptionDocumentText(jd);
    if (!jdDoc.ok) {
      return { error: jdDoc.message };
    }
  } else if (mode === 'topic') {
    if (!topic || topic.length < TOPIC_MIN_CHARS || topic.length > QG_TOPIC_MAX_CHARS) {
      return { error: `Please enter a valid topic (${TOPIC_MIN_CHARS}–${QG_TOPIC_MAX_CHARS} characters).` };
    }
  } else {
    // company mode — still needs a target role, same rule as role mode.
    if (!role || role.length < 2 || role.length > 100) {
      return { error: 'Please enter a valid role (2–100 characters).' };
    }
    if (!company || company.length < COMPANY_MIN_CHARS || company.length > QG_COMPANY_MAX_CHARS) {
      return {
        error: `Please enter a valid company name (${COMPANY_MIN_CHARS}–${QG_COMPANY_MAX_CHARS} characters).`,
      };
    }
  }

  const headersList = await headers();
  const ip = clientIpFromHeaders(headersList);
  const signedIn = true;

  const limited = await checkAndConsumeFreeToolLimit(
    'question-generator',
    { userId: access.userId, ip, tier: access.tier },
    { failClosed: true },
  );
  if (!limited.ok) {
    logToolUsage({ tool: 'question_generator', mode, event: 'rate_limited', signed_in: signedIn });
    return { error: limited.message, code: limited.code };
  }

  const isRoleAnchored = mode === 'role' || mode === 'company';
  const meta: QgResultMeta = {
    mode,
    role: isRoleAnchored ? role : '',
    level,
    domain: isRoleAnchored ? domain : 'general',
    topic: mode === 'topic' ? topic : '',
    company: mode === 'company' ? company : '',
  };

  // Redis cache — role, topic, and company modes. JD sets are never cached
  // (decision D6) since job descriptions are effectively unique per request.
  const cacheKey =
    mode === 'role'
      ? buildQgSetCacheKey({ mode: 'role', role, level, domain })
      : mode === 'topic'
        ? buildQgSetCacheKey({ mode: 'topic', topic, level })
        : mode === 'company'
          ? buildQgSetCacheKey({ mode: 'company', company, role, level, domain })
          : null;
  if (cacheKey) {
    const cachedQuestions = await getCachedQgSet(cacheKey);
    if (cachedQuestions) {
      logToolUsage({ tool: 'question_generator', mode, event: 'cache_hit', signed_in: signedIn });
      recordFreeToolCompleted(access.userId, 'question_generator');
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
    topic: mode === 'topic' ? topic : undefined,
    company: mode === 'company' ? company : undefined,
  });

  if (!result.ok) {
    return {
      error: result.reason === 'invalid_output' ? FRIENDLY_INVALID_ERROR : FRIENDLY_LLM_ERROR,
    };
  }

  if (cacheKey) {
    await setCachedQgSet(cacheKey, result.questions);
  }

  // cost_usd is null here — per-call cost lands in ai_call_logs (qg_set_generation).
  logToolUsage({ tool: 'question_generator', mode, event: 'run', signed_in: signedIn });
  recordFreeToolCompleted(access.userId, 'question_generator');
  return { questions: result.questions, meta, cached: false };
}
