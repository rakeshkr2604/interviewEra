'use server';

import { createHash } from 'crypto';
import { headers } from 'next/headers';
import OpenAI from 'openai';
import { getToolChatClient, isFreeToolAiConfigured } from '@/lib/ai/tool-chat-completion';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import { isSignedInFromHeaders, logToolUsage } from '@/lib/telemetry/tool-usage-logger';
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
import { runAtsAnalysis } from '@/lib/ats/score-engine';
import { ATS_JD_MAX_CHARS, precleanJdText } from '@/lib/ats/jd-input';
import {
  DocxCorruptError,
  DocxEmptyError,
  extractDocxText,
  normalizeDocxFileName,
} from '@/lib/ats/docx-extract';
import type { AtsSourceKind } from '@/lib/ats/parseability';
import {
  getCachedAtsResult,
  setCachedAtsResult,
} from '@/lib/redis/ats-result-cache';
import type { AtsState } from './ats-types';
import { RESUME_HARD_FAIL_MESSAGES } from '@/lib/resume/parse-outcome';

const PDF_USER_MESSAGES: Record<
  'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED' | 'PARSER_RUNTIME',
  string
> = {
  ENCRYPTED: 'This PDF is password-protected. Remove the password and re-upload.',
  SCANNED_NO_TEXT: RESUME_HARD_FAIL_MESSAGES.SCANNED_NO_TEXT.userMessage,
  CORRUPT: 'This PDF could not be read as valid. If you exported from Word or Canva, try “Save as PDF” again.',
  UNSUPPORTED: 'Unsupported file type. Use PDF, DOCX, or TXT.',
  PARSER_RUNTIME:
    'Our server could not finish reading this PDF right now — not necessarily a bad file. Please retry once; if it keeps failing, try exporting the PDF again or use a .txt / .docx file.',
};

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

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

function resumeExtractErrorToState(err: unknown): AtsState {
  if (err instanceof DocxCorruptError) {
    return { error: err.message, code: 'CORRUPT' };
  }
  if (err instanceof DocxEmptyError) {
    return { error: err.message, code: 'TOO_SHORT' };
  }
  return pdfErrorToState(err);
}

function normalizeAtsResumeName(name: string): string {
  return normalizeDocxFileName(normalizeFileName(name));
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const JOB_DESC_MAX_CHARS = ATS_JD_MAX_CHARS;
const MIN_RESUME_CHARS = 50;
// Cache-freshness is now handled structurally, not by remembering to bump
// this: getCachedAtsResult() skips reads entirely outside production
// (ats-result-cache.ts), and DEPLOY_ID below folds the live deploy's commit
// SHA into the key so every production deploy gets a fresh cache namespace
// automatically. This prefix is a third, manual layer on top of those two —
// bump it only if you want to force-invalidate mid-deploy without a redeploy.
const ENGINE_CACHE_PREFIX = 'ats-v3';

// Vercel injects this on every build (VERCEL_GIT_COMMIT_SHA) — already used
// elsewhere in this repo (src/lib/pdf/parser.ts). Local dev has no commit
// SHA at build time, so cache keys there fall back to a constant marker;
// that's fine because local reads are skipped entirely (see above).
const DEPLOY_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'local-dev';

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  );
}

function buildCacheKey(text: string, jd: string, routeTag: string): string {
  return createHash('sha256')
    .update(`${ENGINE_CACHE_PREFIX}|${DEPLOY_ID}|${text}|${jd}|${routeTag}`)
    .digest('hex');
}

function userFacingError(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.code === 'insufficient_quota') {
      return 'AI provider usage limit reached. Add credits (OpenRouter) or try again later.';
    }
    if (err.status === 401) {
      return 'Resume checker API key is invalid or missing. Check OPENROUTER_API_KEY.';
    }
    if (err.status === 402) {
      return 'OpenRouter account needs credits. Top up at openrouter.ai.';
    }
    if (err.status === 429) {
      return 'Too many requests to the AI provider. Wait a minute and try again.';
    }
    if (err.status != null && err.status >= 500) {
      return 'The AI provider had a server error. Please try again in a moment.';
    }
    if (err.code === 'context_length_exceeded') {
      return 'Resume is too long for one request. Try a shorter file.';
    }
  }
  if (err instanceof Error) {
    if (/fetch|network|ECONNRESET/i.test(err.message)) {
      return 'Network error while contacting AI. Check your connection and try again.';
    }
  }
  return "We couldn't analyze this resume right now. Please try again in a moment.";
}

/**
 * Pipeline order (security-relevant):
 * 1) cheap validation (no parse)
 * 2) rate limit — before PDF/DOCX/TXT extraction and LLM
 * 3) extract text
 * 4) Redis result cache (skip LLM on hit)
 * 5) analyze + cache write
 */
export async function checkAtsAction(_prevState: AtsState, formData: FormData): Promise<AtsState> {
  if (!isFreeToolAiConfigured()) {
    return {
      error:
        'Resume checker is not configured. Set OPENROUTER_API_KEY in the environment.',
      code: 'NOT_CONFIGURED',
    };
  }

  const headersList = await headers();
  const ip = getClientIp(headersList);

  const file = formData.get('file');
  const rawJd = formData.get('jobDescription');
  const jdFile = formData.get('jobDescriptionFile');
  // Pre-clean BEFORE slicing so job-board boilerplate doesn't consume the
  // character budget (long JDs keep their Qualifications/Nice-to-have tail).
  const pastedJd =
    typeof rawJd === 'string'
      ? precleanJdText(rawJd).slice(0, JOB_DESC_MAX_CHARS)
      : '';

  if (!file || !(file instanceof File)) {
    return { error: 'Please upload a resume file.', code: 'NO_FILE' };
  }

  if (file.size <= 0) {
    return { error: 'The uploaded file is empty.', code: 'EMPTY' };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { error: 'File exceeds 5 MB limit.', code: 'TOO_LARGE' };
  }

  const normalizedName = normalizeAtsResumeName(file.name);
  const ext = `.${normalizedName.split('.').pop()?.toLowerCase() ?? ''}`;
  const mime = (file.type || '').toLowerCase();
  const looksDocx = ext === '.docx' || mime === DOCX_MIME;
  const looksTxt = ext === '.txt' || mime === 'text/plain';
  const looksPdf = ext === '.pdf' || mime === 'application/pdf';

  if (!looksDocx && !looksTxt && !looksPdf) {
    return { error: PDF_USER_MESSAGES.UNSUPPORTED, code: 'UNSUPPORTED' };
  }

  let sourceKind: AtsSourceKind;
  if (ext === '.docx' || (looksDocx && !looksPdf && !looksTxt)) sourceKind = 'docx';
  else if (ext === '.txt' || (looksTxt && !looksPdf)) sourceKind = 'txt';
  else sourceKind = 'pdf';

  // Cheap JD file validation only — no extract yet.
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
  }

  const signedIn = isSignedInFromHeaders(headersList);

  // Rate limit BEFORE any resume/JD parsing or LLM work.
  const limited = await checkAndConsumeFreeToolLimit('ats-checker', ip, {
    failClosed: true,
  });
  if (!limited.ok) {
    logToolUsage({ tool: 'ats', event: 'rate_limited', signed_in: signedIn });
    return { error: limited.message, code: 'RATE_LIMIT' };
  }

  let pdfBytes: Uint8Array | null = null;
  let resumeText = '';

  try {
    if (sourceKind === 'txt') {
      resumeText = await file.text();
    } else if (sourceKind === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      resumeText = await extractDocxText(new Uint8Array(arrayBuffer));
    } else {
      // Clone twice: pdf.js may detach/transfer the ArrayBuffer during extractText,
      // which would zero-out a shared Uint8Array before layout inspection.
      const arrayBuffer = await file.arrayBuffer();
      const extractCopy = new Uint8Array(arrayBuffer.slice(0));
      pdfBytes = new Uint8Array(arrayBuffer.slice(0));
      const jdHeaderList = await headers();
      resumeText = await extractText(extractCopy, {
        mimeType: file.type,
        fileNameHint: normalizedName,
        vercelId: jdHeaderList.get('x-vercel-id') ?? '',
        source: 'ats-checker',
      });
    }
  } catch (extractErr) {
    console.error('[ats-checker] resume extract error', extractErr);
    return resumeExtractErrorToState(extractErr);
  }

  const trimmed = resumeText.trim();
  if (!trimmed || trimmed.length < MIN_RESUME_CHARS) {
    return {
      error:
        'Not enough readable text (need at least 50 characters). Scanned PDFs and image-only Word files often have no text — try a text-based PDF/DOCX or paste plain text.',
      code: 'TOO_SHORT',
    };
  }

  let jobDescription = pastedJd;
  if (jdFile && jdFile instanceof File && jdFile.size > 0) {
    const jdExt = `.${normalizeFileName(jdFile.name).split('.').pop()?.toLowerCase() ?? ''}`;
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
      const jdText = precleanJdText(extracted);
      if (jdText.length > 0) jobDescription = jdText.slice(0, JOB_DESC_MAX_CHARS);
    } catch (err) {
      console.error('[ats-checker] JD extract error', err);
      const jdState = pdfErrorToState(err);
      return { error: 'Job description: ' + (jdState.error ?? ''), code: jdState.code };
    }
  }

  const { route } = getToolChatClient();
  const cacheKey = buildCacheKey(
    trimmed,
    `${jobDescription}|phase2-jd-match`,
    route === 'openrouter' ? 'or' : 'oa',
  );
  const cached = await getCachedAtsResult(cacheKey);
  if (cached) {
    logToolUsage({ tool: 'ats', event: 'cache_hit', signed_in: signedIn });
    return { result: cached };
  }

  try {
    const { result, meta } = await runAtsAnalysis({
      rawText: trimmed,
      pdfBytes,
      sourceKind,
      jobDescription: jobDescription.length >= 40 ? jobDescription : undefined,
    });
    console.info(
      '[ats-checker] tokens',
      JSON.stringify({
        model: meta.model,
        prompt_tokens: meta.usage?.prompt_tokens ?? null,
        completion_tokens: meta.usage?.completion_tokens ?? null,
        total_tokens: meta.usage?.total_tokens ?? null,
        jdExtract_prompt_tokens: meta.jdExtractUsage?.prompt_tokens ?? null,
        jdExtract_completion_tokens: meta.jdExtractUsage?.completion_tokens ?? null,
        embedding_tokens: meta.embeddingUsage?.total_tokens ?? null,
        embedding_cost: meta.embeddingUsage?.cost ?? null,
        embedding_model: meta.embeddingModel ?? null,
        jdPresent: jobDescription.length >= 40,
        jdMatchScore: result.jdMatch?.score ?? null,
      }),
    );
    await setCachedAtsResult(cacheKey, result);
    // cost_usd is null here — per-call cost lands in ai_call_logs
    // (ats_field_extraction / ats_jd_extraction / ats_embedding rows).
    logToolUsage({ tool: 'ats', event: 'run', signed_in: signedIn });
    return { result };
  } catch (err) {
    console.error('[ats-checker] analyze failed', err);
    logToolUsage({ tool: 'ats', event: 'error', signed_in: signedIn });
    return { error: userFacingError(err), code: 'AI_ERROR' };
  }
}
