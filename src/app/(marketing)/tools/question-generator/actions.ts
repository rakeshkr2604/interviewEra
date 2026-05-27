'use server';

import { headers } from 'next/headers';
import { completeFreeToolChatChain, isFreeToolAiConfigured } from '@/lib/ai/tool-chat-completion';
import { parseJsonObject } from '@/lib/ai/response-contract';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';

export interface GeneratedQuestion {
  order: number;
  question_text: string;
  category: 'technical' | 'behavioral' | 'situational';
}

interface GenerateResult {
  questions?: GeneratedQuestion[];
  error?: string;
}

const questionCache = new Map<
  string,
  { questions: GeneratedQuestion[]; expiresAt: number }
>();

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const OPENROUTER_QUESTION_MODELS = [
  process.env.OPENROUTER_QUESTIONS_MODEL?.trim() || 'openai/gpt-4.1-mini',
];

function extractJSON(content: string): string {
  const pr = parseJsonObject(content);
  if (pr.ok) return JSON.stringify(pr.value);
  throw new Error(pr.error || 'parse failed');
}

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
  const role = (formData.get('role') as string | null)?.trim() ?? '';
  const level = (formData.get('level') as string | null)?.trim() ?? 'fresher';
  const domain = (formData.get('domain') as string | null)?.trim() ?? 'general';

  if (!role || role.length < 2 || role.length > 100) {
    return { error: 'Please enter a valid role (2–100 characters).' };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);
  const now = Date.now();

  const cacheKey = `${role.toLowerCase()}|${level}|${domain}`;
  const cached = questionCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return { questions: cached.questions };
  }

  const limited = checkAndConsumeFreeToolLimit('question-generator', ip);
  if (!limited.ok) {
    return { error: limited.message };
  }

  if (!isFreeToolAiConfigured()) {
    return {
      error: 'AI is not configured. Set OPENROUTER_API_KEY, then try again.',
    };
  }

  const prompt = `You are an expert technical interviewer. Generate exactly 10 interview questions.
Role: ${role}
Experience Level: ${level}
Domain: ${domain}

Rules:
- Questions must be specific to the role and domain
- Mix: 40% technical, 30% behavioral, 30% situational
- No repetitive or generic questions

Return ONLY valid JSON, no markdown:
{
  "questions": [
    {
      "order": 1,
      "question_text": "string",
      "category": "technical" | "behavioral" | "situational"
    }
  ]
}`;

  let raw = '{}';
  try {
    raw = await completeFreeToolChatChain({
      openrouterModels: [...new Set(OPENROUTER_QUESTION_MODELS.filter(Boolean))],
      openaiModels: [],
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });
  } catch (openErr) {
    console.warn('[question-generator] OpenRouter failed:', openErr);
    return {
      error:
        'Question generation failed (quota, rate limit, or network). Wait a moment and try again.',
    };
  }

  let parsed: { questions?: GeneratedQuestion[] };
  try {
    parsed = JSON.parse(raw) as { questions?: GeneratedQuestion[] };
  } catch {
    try {
      parsed = JSON.parse(extractJSON(raw)) as { questions?: GeneratedQuestion[] };
    } catch {
      return { error: 'AI returned unreadable JSON. Please try again.' };
    }
  }

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return { error: 'AI returned an unexpected format. Please try again.' };
  }

  const questions = parsed.questions.slice(0, 10);

  questionCache.set(cacheKey, { questions, expiresAt: now + CACHE_TTL_MS });

  return { questions };
}
