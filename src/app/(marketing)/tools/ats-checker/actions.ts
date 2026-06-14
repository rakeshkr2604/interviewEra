'use server';

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import OpenAI from 'openai';
import { completeFreeToolChatChain, getToolChatClient, isFreeToolAiConfigured } from '@/lib/ai/tool-chat-completion';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import {
  extractText,
  normalizeFileName,
  PDFCorruptError,
  PDFEncryptedError,
  PDFParserRuntimeError,
  PDFParserUnavailableError,
  PDFScannedNoTextError,
  PDFUnsupportedError,
} from '@/lib/pdf/parser';
import type { AtsResult, AtsState } from './ats-types';
import { RESUME_HARD_FAIL_MESSAGES } from '@/lib/resume/parse-outcome';

const PDF_USER_MESSAGES: Record<
  'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED' | 'PARSER_RUNTIME',
  string
> = {
  ENCRYPTED: 'This PDF is password-protected. Remove the password and re-upload.',
  SCANNED_NO_TEXT: RESUME_HARD_FAIL_MESSAGES.SCANNED_NO_TEXT.userMessage,
  CORRUPT: 'This PDF could not be read as valid. If you exported from Word or Canva, try “Save as PDF” again.',
  UNSUPPORTED: 'Unsupported file type. Use PDF or TXT.',
  PARSER_RUNTIME:
    'Our server could not finish reading this PDF right now — not necessarily a bad file. Please retry once; if it keeps failing, try exporting the PDF again or use a .txt file.',
};

const PARSER_UNAVAILABLE_MESSAGE = 'Resume parser is temporarily unavailable. Please retry in a minute.';

function pdfErrorToState(err: unknown): AtsState {
  if (err instanceof PDFParserUnavailableError) {
    return { error: PARSER_UNAVAILABLE_MESSAGE, code: 'PARSER_UNAVAILABLE' };
  }
  if (err instanceof PDFParserRuntimeError) {
    return { error: PDF_USER_MESSAGES.PARSER_RUNTIME, code: 'PARSER_RUNTIME' };
  }
  if (err instanceof PDFEncryptedError)
    return { error: PDF_USER_MESSAGES.ENCRYPTED, code: 'ENCRYPTED' };
  if (err instanceof PDFScannedNoTextError)
    return { error: PDF_USER_MESSAGES.SCANNED_NO_TEXT, code: 'SCANNED_NO_TEXT' };
  if (err instanceof PDFCorruptError)
    return { error: PDF_USER_MESSAGES.CORRUPT, code: 'CORRUPT' };
  if (err instanceof PDFUnsupportedError)
    return { error: PDF_USER_MESSAGES.UNSUPPORTED, code: 'UNSUPPORTED' };
  return { error: PDF_USER_MESSAGES.PARSER_RUNTIME, code: 'PARSER_RUNTIME' };
}

async function extractFileText(file: File): Promise<string> {
  // Strip duplicate trailing extensions (`resume.pdf.pdf` → `resume.pdf`)
  // before extension-based MIME validation; some browsers add them.
  const normalized = normalizeFileName(file.name);
  const ext = `.${normalized.split('.').pop()?.toLowerCase() ?? ''}`;
  if (ext === '.txt') return await file.text();
  if (ext === '.pdf') {
    const headerList = await headers();
    const arrayBuffer = await file.arrayBuffer();
    return await extractText(arrayBuffer, {
      mimeType: file.type,
      fileNameHint: normalized,
      vercelId: headerList.get('x-vercel-id') ?? '',
      source: 'ats-checker',
    });
  }
  throw new PDFUnsupportedError();
}

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
      code: 'NOT_CONFIGURED',
    };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);
  const now = Date.now();

  const file = formData.get('file');
  const rawJd = formData.get('jobDescription');
  const jdFile = formData.get('jobDescriptionFile');
  const pastedJd =
    typeof rawJd === 'string' ? rawJd.trim().slice(0, JOB_DESC_MAX_CHARS) : '';

  if (!file || !(file instanceof File)) {
    return { error: 'Please upload a resume file.', code: 'NO_FILE' };
  }

  if (file.size <= 0) {
    return { error: 'The uploaded file is empty.', code: 'EMPTY' };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: 'File exceeds 5 MB limit.', code: 'TOO_LARGE' };
  }

  const ext = `.${normalizeFileName(file.name).split('.').pop()?.toLowerCase() ?? ''}`;
  if (ext !== '.pdf' && ext !== '.txt') {
    return { error: PDF_USER_MESSAGES.UNSUPPORTED, code: 'UNSUPPORTED' };
  }

  let resumeText = '';
  try {
    resumeText = await extractFileText(file);
  } catch (pdfErr) {
    console.error('[ats-checker] resume extract error', pdfErr);
    return pdfErrorToState(pdfErr);
  }

  const trimmed = resumeText.trim();
  if (!trimmed || trimmed.length < MIN_RESUME_CHARS) {
    return {
      error:
        'Not enough readable text (need at least 50 characters). Scanned PDFs often have no text — try "Save as PDF" from Word or paste plain text.',
      code: 'TOO_SHORT',
    };
  }

  // Job description: PDF/TXT upload wins over paste when both are present
  // (last input wins — uploading a file is the more deliberate action).
  let jobDescription = pastedJd;
  if (jdFile && jdFile instanceof File && jdFile.size > 0) {
    if (jdFile.size > MAX_FILE_BYTES) {
      return { error: 'Job description file exceeds 5 MB limit.', code: 'TOO_LARGE' };
    }
    const jdExt = `.${normalizeFileName(jdFile.name).split('.').pop()?.toLowerCase() ?? ''}`;
    if (jdExt !== '.pdf' && jdExt !== '.txt') {
      return {
        error: 'Job description: ' + PDF_USER_MESSAGES.UNSUPPORTED,
        code: 'UNSUPPORTED',
      };
    }
    try {
      const jdHeaderList = await headers();
      const jdNormalized = normalizeFileName(jdFile.name);
      const extracted =
        jdExt === '.txt'
          ? await jdFile.text()
          : await extractText(await jdFile.arrayBuffer(), {
              mimeType: jdFile.type,
              fileNameHint: jdNormalized,
              vercelId: jdHeaderList.get('x-vercel-id') ?? '',
              source: 'ats-checker-jd',
            });
      const jdText = extracted.trim();
      if (jdText.length > 0) jobDescription = jdText.slice(0, JOB_DESC_MAX_CHARS);
    } catch (err) {
      console.error('[ats-checker] JD extract error', err);
      const jdState = pdfErrorToState(err);
      return { error: 'Job description: ' + (jdState.error ?? ''), code: jdState.code };
    }
  }

  const { route } = getToolChatClient();
  const cacheKey = buildCacheKey(trimmed, `${jobDescription}|${route === 'openrouter' ? 'or' : 'oa'}`);
  const cached = resultCache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    return { result: cached.result };
  }

  const limited = checkAndConsumeFreeToolLimit('ats-checker', ip);
  if (!limited.ok) {
    return { error: limited.message, code: 'RATE_LIMIT' };
  }

  try {
    const result = await analyzeAts(trimmed, jobDescription);
    resultCache.set(cacheKey, { result, expiresAt: now + CACHE_TTL_MS });
    return { result };
  } catch (err) {
    console.error('[ats-checker] analyze failed', err);
    return { error: userFacingError(err), code: 'AI_ERROR' };
  }
}
