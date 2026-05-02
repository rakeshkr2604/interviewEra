'use server';

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import OpenAI from 'openai';
import { completeFreeToolChatChain, getToolChatClient, isFreeToolAiConfigured } from '@/lib/ai/tool-chat-completion';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import { PDFParse } from 'pdf-parse';
import type { AtsResult, AtsState } from './ats-types';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const RESUME_PROMPT_CHARS = 8000;
const JOB_DESC_MAX_CHARS = 4000;
const MIN_RESUME_CHARS = 50;

const resultCache = new Map<string, { result: AtsResult; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  );
}

function buildCacheKey(text: string, jd: string): string {
  return createHash('sha256').update(`${text}|${jd}`).digest('hex');
}

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

function isValidResult(data: unknown): data is AtsResult {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.score !== 'number' || !Number.isFinite(d.score)) return false;
  if (!Array.isArray(d.issues)) return false;
  return d.issues.every(
    (i: unknown) =>
      i &&
      typeof i === 'object' &&
      typeof (i as Record<string, unknown>).type === 'string' &&
      ['success', 'warning', 'error'].includes((i as Record<string, unknown>).type as string) &&
      typeof (i as Record<string, unknown>).text === 'string' &&
      String((i as Record<string, unknown>).text).trim().length > 0,
  );
}

function normalizeResult(raw: AtsResult): AtsResult {
  const score = Math.round(Math.min(100, Math.max(0, raw.score)));
  const issues = raw.issues
    .map((i) => ({
      type: i.type,
      text: String(i.text).trim(),
    }))
    .filter((i) => i.text.length > 0)
    .slice(0, 12);

  if (issues.length === 0) {
    issues.push({
      type: 'warning',
      text: 'The model did not return detailed feedback. Try again, or export your resume as text-based PDF.',
    });
  }

  return { score, issues };
}

function parseModelOutput(content: string): AtsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJSON(content));
  } catch {
    throw new Error('Model response was not valid JSON');
  }
  if (!isValidResult(parsed)) {
    throw new Error('Model JSON did not match expected ATS result shape');
  }
  return normalizeResult(parsed);
}

function buildPrompt(resumeSlice: string, jobDescription: string): string {
  const jdSection = jobDescription.trim()
    ? `Job Description:\n${jobDescription.trim()}\n\n`
    : 'No job description provided.\n\n';

  return (
    `You are an ATS (Applicant Tracking System) compatibility expert.\n` +
    `Analyze the following resume text for ATS compatibility.\n\n` +
    `${jdSection}` +
    `Resume Text:\n${resumeSlice}\n\n` +
    `Evaluate for these criteria and return JSON only:\n` +
    `1. Proper section headings (Experience, Education, Skills)\n` +
    `2. Action verbs in experience bullets\n` +
    `3. ATS-safe layout (no tables, columns, headers/footers, text boxes)\n` +
    `4. Contact information completeness (name, email, phone)\n` +
    `5. Keyword matching with job description (if provided)\n` +
    `6. Quantified achievements in experience\n` +
    `7. Standard fonts and formatting\n\n` +
    `Return ONLY valid JSON:\n` +
    `{\n` +
    `  "score": number (0–100, ATS compatibility score),\n` +
    `  "issues": [\n` +
    `    { "type": "success" | "warning" | "error", "text": "string" }\n` +
    `  ]\n` +
    `}\n` +
    `Include 4–8 issues covering all criteria. Be specific and actionable.`
  );
}

const OPENROUTER_ATS_MODELS = [
  process.env.OPENROUTER_ATS_MODEL?.trim() || 'openai/gpt-4o-mini',
  'openai/gpt-4.1-mini',
  'openai/gpt-4o-mini-2024-07-18',
  'openai/gpt-3.5-turbo',
  'google/gemini-2.0-flash-001',
];

const OPENAI_ATS_MODELS = [
  process.env.OPENAI_ATS_MODEL?.trim() || 'gpt-4o-mini',
  'gpt-4.1-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-3.5-turbo-0125',
];

async function analyzeAts(resumeText: string, jobDescription: string): Promise<AtsResult> {
  const resumeSlice = resumeText.slice(0, RESUME_PROMPT_CHARS);
  const prompt = buildPrompt(resumeSlice, jobDescription);

  const content = await completeFreeToolChatChain({
    openrouterModels: [...new Set(OPENROUTER_ATS_MODELS.filter(Boolean))],
    openaiModels: [...new Set(OPENAI_ATS_MODELS.filter(Boolean))],
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  return parseModelOutput(content);
}

function userFacingError(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.code === 'insufficient_quota') {
      return 'AI provider usage limit reached. Add credits (OpenRouter/OpenAI) or try again later.';
    }
    if (err.status === 401) {
      return 'Resume checker API key is invalid or missing. Check OPENROUTER_API_KEY or OPENAI_API_KEY.';
    }
    if (err.status === 402) {
      return 'OpenRouter account needs credits. Top up at openrouter.ai or set OPENAI_API_KEY as fallback.';
    }
    if (err.status === 429) {
      return 'Too many requests to the AI provider. Wait a minute and try again.';
    }
    if (err.status != null && err.status >= 500) {
      return 'The AI provider had a server error. Please try again in a moment.';
    }
    if (err.code === 'context_length_exceeded') {
      return 'Resume or job description is too long for one request. Shorten the job description or use a smaller file.';
    }
  }
  if (err instanceof Error) {
    if (/fetch|network|ECONNRESET/i.test(err.message)) {
      return 'Network error while contacting AI. Check your connection and try again.';
    }
  }
  return "We couldn't analyze this resume right now. Please try again in a moment.";
}

export async function checkAtsAction(_prevState: AtsState, formData: FormData): Promise<AtsState> {
  if (!isFreeToolAiConfigured()) {
    return {
      error:
        'Resume checker is not configured. Set OPENROUTER_API_KEY (recommended) or OPENAI_API_KEY in the environment.',
    };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);
  const now = Date.now();

  const file = formData.get('file');
  const rawJd = formData.get('jobDescription');
  const jobDescription =
    typeof rawJd === 'string' ? rawJd.slice(0, JOB_DESC_MAX_CHARS) : '';

  if (!file || !(file instanceof File)) {
    return { error: 'Please upload a resume file.' };
  }

  if (file.size <= 0) {
    return { error: 'The uploaded file is empty.' };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: 'File exceeds 5 MB limit.' };
  }

  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
  if (ext !== '.pdf' && ext !== '.txt') {
    return { error: 'Only PDF and TXT files are supported.' };
  }

  let resumeText = '';
  try {
    if (ext === '.pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const parser = new PDFParse({ data: arrayBuffer });
      try {
        const textResult = await parser.getText();
        resumeText = textResult.text ?? '';
      } finally {
        await parser.destroy();
      }
    } else {
      resumeText = await file.text();
    }
  } catch (pdfErr) {
    console.error('[ats-checker] extract error', pdfErr);
    return { error: 'Could not read this file. Try a text-based PDF (not a scan) or a .txt export.' };
  }

  const trimmed = resumeText.trim();
  if (!trimmed || trimmed.length < MIN_RESUME_CHARS) {
    return {
      error:
        'Not enough readable text (need at least 50 characters). Scanned PDFs often have no text — try "Save as PDF" from Word or paste plain text.',
    };
  }

  const { route } = getToolChatClient();
  const cacheKey = buildCacheKey(trimmed, `${jobDescription}|${route === 'openrouter' ? 'or' : 'oa'}`);
  const cached = resultCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return { result: cached.result };
  }

  const limited = checkAndConsumeFreeToolLimit('ats-checker', ip);
  if (!limited.ok) {
    return { error: limited.message };
  }

  try {
    const result = await analyzeAts(trimmed, jobDescription);
    resultCache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
    return { result };
  } catch (err) {
    console.error('[ats-checker] analyze failed', err);
    return { error: userFacingError(err) };
  }
}
