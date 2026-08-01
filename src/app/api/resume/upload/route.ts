import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { ensurePublicUserRow } from '@/lib/supabase/ensure-public-user';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';
import {
  extractText,
  normalizeFileName,
  PDFCorruptError,
  PDFEncryptedError,
  PDFParserRuntimeError,
  PDFParserUnavailableError,
  PDFScannedNoTextError,
  PDFUnsupportedError,
  type PDFErrorCode,
} from '@/lib/pdf/parser';
import { PDFTooManyPagesError } from '@/lib/pdf/parser-errors';
import { assertPdfPageLimit, RESUME_PDF_MAX_PAGES } from '@/lib/pdf/page-count';
import { assertLooksLikeResume } from '@/lib/documents/document-classification';
import { getMultipleFilesError } from '@/lib/http/form-data-single-file';
import { MULTIPART_UPLOAD_MAX_BYTES, normalizedUploadContentType } from '@/lib/http/upload-limits';
import { normalizeExtractedDocumentText } from '@/lib/utils/normalize-extracted-document-text';
import { runLayeredTextExtraction } from '@/lib/resume/extraction-pipeline';
import { isObviouslyGarbage, scoreExtractedText } from '@/lib/resume/extraction-quality';
import { RESUME_HARD_FAIL_MESSAGES, resumeUserError } from '@/lib/resume/parse-outcome';
import { getAttributionFromRequest } from '@/lib/analytics/attribution';
import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { trackProductEvent } from '@/lib/analytics/product-events';
import {
  isUploadDiagnosticsEnabled,
  shouldBypassResumeParsePipeline,
  shouldSkipResumeDbInsert,
  supabaseServiceKeyFormat,
} from '@/lib/debug/upload-diagnostics';

// pdfjs-dist is Node-only; never Edge.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE = MULTIPART_UPLOAD_MAX_BYTES;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

/** Placeholder body when IE_UPLOAD_BYPASS_PARSE=1 — must pass assertLooksLikeResume heuristics. */
const BYPASS_RESUME_PLACEHOLDER = `
Resume — Debug Bypass Parse
Work experience
Software Engineer at ACME Corp 2021–2024
Technical skills: JavaScript, TypeScript, React, Node.js
Education: B.Tech Computer Science, CGPA 8.5
Projects: Mock interview platform
Internship at Example Labs
Certification: AWS Cloud Practitioner
Languages known: English, Hindi
`.trim();

const PDF_ERROR_MESSAGES: Record<PDFErrorCode, string> = {
  ENCRYPTED: 'This PDF is password-protected. Remove the password and re-upload.',
  SCANNED_NO_TEXT: RESUME_HARD_FAIL_MESSAGES.SCANNED_NO_TEXT.userMessage,
  CORRUPT:
    'This PDF could not be read as valid. If it opens on your laptop, export it again (“Save as PDF”) and re-upload.',
  UNSUPPORTED: 'Unsupported file type. Use PDF or TXT.',
};

type ResumeUploadPdfErrorCode =
  | PDFErrorCode
  | 'PARSER_UNAVAILABLE'
  | 'PARSER_RUNTIME'
  | 'TOO_MANY_PAGES';

const PDF_PARSER_INFRA_MESSAGES: Pick<
  Record<ResumeUploadPdfErrorCode, string>,
  'PARSER_UNAVAILABLE' | 'PARSER_RUNTIME'
> = {
  PARSER_UNAVAILABLE: 'Resume parser is temporarily unavailable. Please retry in a minute.',
  PARSER_RUNTIME:
    'Could not finish reading this PDF on our servers yet. Retry once — if it persists, re-export as PDF from Word/Canva or upload a .txt resume.',
};

function withReqId(reqId: string, headers?: Record<string, string>): Record<string, string> {
  return { 'X-Request-Id': reqId, ...headers };
}

function jsonWithReq<T extends Record<string, unknown>>(
  body: T,
  status: number,
  reqId: string,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { ...body, requestId: reqId },
    { status, headers: withReqId(reqId, extraHeaders) },
  );
}

/** Pick single upload from `file` or `resume` (multipart); both non-empty → error. */
function getSingleUploadedFile(formData: FormData): { file: File } | { error: string; code: string } {
  const multiA = getMultipleFilesError(formData, 'file');
  const multiB = getMultipleFilesError(formData, 'resume');
  if (multiA) return { error: multiA, code: 'MULTIPLE_FILES' };
  if (multiB) return { error: multiB, code: 'MULTIPLE_FILES' };

  const a = formData.get('file');
  const b = formData.get('resume');
  const fileA = a instanceof File && a.size > 0 ? a : null;
  const fileB = b instanceof File && b.size > 0 ? b : null;

  if (fileA && fileB) {
    return {
      error: 'Use a single upload field (`file` or `resume`), not both.',
      code: 'MULTIPLE_FILE_FIELDS',
    };
  }

  const file =
    fileA ??
    fileB ??
    (a instanceof File ? a : null) ??
    (b instanceof File ? b : null);

  if (!file || !(file instanceof File)) {
    return { error: 'No file provided', code: 'NO_FILE' };
  }
  return { file };
}

function classifyPdfError(err: unknown): {
  code: ResumeUploadPdfErrorCode;
  message: string;
  suggestion?: string;
} {
  if (err instanceof PDFParserUnavailableError) {
    const m = RESUME_HARD_FAIL_MESSAGES.PARSER_UNAVAILABLE;
    return { code: 'PARSER_UNAVAILABLE', message: m.userMessage, suggestion: m.suggestion };
  }
  if (err instanceof PDFParserRuntimeError) {
    return { code: 'PARSER_RUNTIME', message: PDF_PARSER_INFRA_MESSAGES.PARSER_RUNTIME };
  }
  if (err instanceof PDFEncryptedError) {
    const m = RESUME_HARD_FAIL_MESSAGES.ENCRYPTED_PDF;
    return { code: 'ENCRYPTED', message: m.userMessage, suggestion: m.suggestion };
  }
  if (err instanceof PDFScannedNoTextError) {
    const m = RESUME_HARD_FAIL_MESSAGES.SCANNED_NO_TEXT;
    return { code: 'SCANNED_NO_TEXT', message: m.userMessage, suggestion: m.suggestion };
  }
  if (err instanceof PDFCorruptError) {
    const m = RESUME_HARD_FAIL_MESSAGES.CORRUPT_FILE;
    return { code: 'CORRUPT', message: m.userMessage, suggestion: m.suggestion };
  }
  if (err instanceof PDFUnsupportedError) return { code: 'UNSUPPORTED', message: PDF_ERROR_MESSAGES.UNSUPPORTED };
  if (err instanceof PDFTooManyPagesError) {
    return {
      code: 'TOO_MANY_PAGES',
      message: `This PDF has ${err.pageCount} pages. Please upload a resume with at most ${err.maxPages} pages.`,
      suggestion: 'Export a shorter PDF (≤10 pages) or a .txt resume.',
    };
  }
  return { code: 'PARSER_RUNTIME', message: PDF_PARSER_INFRA_MESSAGES.PARSER_RUNTIME };
}

function uploadReject(
  code: string,
  userMessage: string,
  suggestion: string | undefined,
  status: number,
  reqId: string,
  extra?: Record<string, string>,
): NextResponse {
  const body = resumeUserError(code, userMessage, suggestion);
  return jsonWithReq(body, status, reqId, extra);
}

function hasPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  const scanLimit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= scanLimit; i++) {
    if (
      bytes[i] === 0x25 &&
      bytes[i + 1] === 0x50 &&
      bytes[i + 2] === 0x44 &&
      bytes[i + 3] === 0x46 &&
      bytes[i + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

const RESUME_BUCKET = 'resumes';

function classifyStorageError(err: unknown): string {
  if (!(err instanceof Object)) return 'Could not save your file to storage. Please retry.';
  const e = err as { message?: string; statusCode?: string; error?: string };
  const status = e.statusCode;
  const msg = (e.message ?? e.error ?? '').toLowerCase();
  if (status === '404' || msg.includes('not found') || msg.includes('does not exist')) {
    return `Storage bucket "${RESUME_BUCKET}" not found. Create it in Supabase Dashboard → Storage.`;
  }
  if (status === '403' || status === '401' || msg.includes('permission') || msg.includes('unauthorized') || msg.includes('not allowed')) {
    return 'Storage permission denied. Verify the service role key has storage access in Supabase.';
  }
  return 'Could not save your file to storage. Check your connection and retry.';
}

function diagPayload(stage: string, err: unknown, reqId: string): Record<string, unknown> {
  if (!isUploadDiagnosticsEnabled()) {
    return { error: 'Something went wrong on our side. Please try again.', code: 'INTERNAL', requestId: reqId };
  }
  const e = err instanceof Error ? err : new Error(String(err));
  return {
    ok: false,
    stage,
    error: e.message,
    stack: e.stack,
    requestId: reqId,
    diagnostics: true,
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const uploadStarted = Date.now();
  const reqId = randomUUID().slice(0, 8);
  const vercelId = request.headers.get('x-vercel-id');

  console.log('[UPLOAD_STAGE] request_start', { reqId, vercel_id: vercelId ?? 'n/a' });

  const cl = request.headers.get('content-length');
  if (cl) {
    const n = Number(cl);
    console.log('[UPLOAD_STAGE] content_length', { reqId, contentLength: cl, parsed: Number.isFinite(n) ? n : 'nan' });
    if (Number.isFinite(n) && n > MAX_FILE_SIZE + 512 * 1024) {
      console.warn('[UPLOAD_STAGE] content_length_reject', { reqId, n, maxReasonable: MAX_FILE_SIZE + 512 * 1024 });
      return jsonWithReq(
        {
          error: 'Request body too large for this endpoint.',
          code: 'BODY_TOO_LARGE',
        },
        413,
        reqId,
      );
    }
  } else {
    console.log('[UPLOAD_STAGE] content_length', { reqId, contentLength: 'missing' });
  }

  try {
    console.log('[UPLOAD_STAGE] auth_start', { reqId });
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    console.log('[UPLOAD_STAGE] auth_done', { reqId, ok: !!user, authErr: authError?.message ?? null });

    if (authError || !user) {
      console.warn(`[resume/upload][${reqId}] auth failed`, authError?.message);
      return jsonWithReq({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401, reqId);
    }

    const urlPresent = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const svcKeyPresent = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    console.log('[UPLOAD_STAGE] env_presence', {
      reqId,
      urlPresent,
      svcKeyPresent,
      svcKeyFormat: supabaseServiceKeyFormat(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    if (!urlPresent || !svcKeyPresent) {
      console.error(`[resume/upload][${reqId}] env vars absent — url:${urlPresent} svcKey:${svcKeyPresent}`);
      return jsonWithReq(
        {
          error: `Resume upload is misconfigured: ${!urlPresent ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY'} is absent on this deployment.`,
          code: 'ENV_MISSING',
        },
        503,
        reqId,
      );
    }

    console.log('[UPLOAD_STAGE] rate_limit_start', { reqId });
    const rateLimit = await checkRateLimit(`upload:${user.id}`, 300, 5, { failClosed: true });
    console.log('[UPLOAD_STAGE] rate_limit_done', { reqId, allowed: rateLimit.allowed });
    const blocked = buildRateLimitHttpResponse(
      rateLimit,
      'Too many uploads. Please wait a few minutes before trying again.',
    );
    if (blocked) {
      return jsonWithReq(
        {
          ...blocked.body,
          code: rateLimit.redisUnavailable ? 'UPLOAD_RATE_LIMIT_UNAVAILABLE' : 'UPLOAD_RATE_LIMIT',
        },
        blocked.status,
        reqId,
        blocked.headers,
      );
    }

    console.log('[UPLOAD_STAGE] createServiceClient_start', { reqId });
    let serviceClient: ReturnType<typeof createServiceClient>;
    try {
      serviceClient = createServiceClient();
    } catch (svcErr) {
      const svcErrMsg = svcErr instanceof Error ? svcErr.message : String(svcErr);
      console.error('[UPLOAD_STAGE] createServiceClient_error', { reqId, message: svcErrMsg });
      return jsonWithReq(
        isUploadDiagnosticsEnabled()
          ? {
              ok: false,
              stage: 'createServiceClient',
              error: svcErrMsg,
              stack: svcErr instanceof Error ? svcErr.stack : undefined,
            }
          : {
              error: svcErrMsg,
              code: 'SERVICE_CLIENT_ERROR',
            },
        503,
        reqId,
      );
    }
    console.log('[UPLOAD_STAGE] createServiceClient_done', { reqId });

    console.log('[UPLOAD_STAGE] ensure_public_user_start', { reqId });
    const ensured = await ensurePublicUserRow(serviceClient, user);
    console.log('[UPLOAD_STAGE] ensure_public_user_done', { reqId, ok: ensured.ok });
    if (!ensured.ok) {
      console.error('[UPLOAD_STAGE] ensure_public_user_failed', {
        reqId,
        code: ensured.code,
        message: ensured.message,
      });
      return jsonWithReq(
        {
          error:
            'Your account profile is still syncing. Sign out, sign in again, then retry — or contact support if this persists.',
          code: 'USER_PROFILE_MISSING',
          ...(isUploadDiagnosticsEnabled()
            ? { stage: 'ensure_public_user', details: ensured.message }
            : {}),
        },
        503,
        reqId,
      );
    }

    console.log('[UPLOAD_STAGE] formData_start', { reqId });
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (fdErr) {
      console.error('[UPLOAD_STAGE] formData_error', { reqId, err: fdErr });
      const body = isUploadDiagnosticsEnabled()
        ? {
            ok: false,
            stage: 'formData',
            error: fdErr instanceof Error ? fdErr.message : String(fdErr),
            stack: fdErr instanceof Error ? fdErr.stack : undefined,
          }
        : { error: 'Could not read upload body.', code: 'FORM_DATA_FAILED' };
      return jsonWithReq(body as Record<string, unknown>, 500, reqId);
    }
    console.log('[UPLOAD_STAGE] formData_done', { reqId });

    const picked = getSingleUploadedFile(formData);
    if ('error' in picked) {
      return jsonWithReq(
        {
          error: picked.error,
          code: picked.code,
        },
        400,
        reqId,
      );
    }
    const { file } = picked;

    /** Optional: add a new version lineage point on an existing resume (Prompt 2 UI). */
    const resumeIdField = formData.get('resumeId');
    const targetResumeId =
      typeof resumeIdField === 'string' && /^[0-9a-f-]{36}$/i.test(resumeIdField.trim())
        ? resumeIdField.trim()
        : null;

    const uploadId = randomUUID();

    trackProductEvent({ event: 'upload_started', userId: user.id });

    console.log('[UPLOAD_STAGE] file_meta', {
      reqId,
      name: file.name,
      type: file.type,
      size: file.size,
    });

    if (file.size <= 0) {
      return jsonWithReq({ error: 'The uploaded file is empty.', code: 'EMPTY_FILE' }, 400, reqId);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonWithReq(
        {
          error: `File exceeds ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))} MB limit. Export a smaller PDF or use .txt.`,
          code: 'FILE_TOO_LARGE',
        },
        400,
        reqId,
      );
    }

    const normalizedName = normalizeFileName(file.name);
    const ext = `.${normalizedName.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return jsonWithReq(
        {
          error: 'Only PDF and TXT files are supported. Please upload a PDF for best results.',
          code: 'UNSUPPORTED_EXT',
        },
        400,
        reqId,
      );
    }

    console.log('[UPLOAD_STAGE] buffer_start', { reqId });
    const arrayBuffer = await file.arrayBuffer();
    const parseBytes = new Uint8Array(arrayBuffer).slice();
    console.log('[UPLOAD_STAGE] buffer_done', { reqId, bytes: parseBytes.byteLength });

    let sanitizedRaw: string;

    if (shouldBypassResumeParsePipeline()) {
      console.warn('[UPLOAD_STAGE] BYPASS_PARSE active — skipping extraction/classifier', { reqId });
      sanitizedRaw = normalizeExtractedDocumentText(BYPASS_RESUME_PLACEHOLDER, 400_000);
    } else {
      let rawText = '';
      if (ext === '.pdf') {
        console.log('[UPLOAD_STAGE] pdf_page_limit_start', { reqId, maxPages: RESUME_PDF_MAX_PAGES });
        try {
          const pageCount = await assertPdfPageLimit(parseBytes, RESUME_PDF_MAX_PAGES);
          console.log('[UPLOAD_STAGE] pdf_page_limit_ok', { reqId, pageCount });
        } catch (err) {
          const { code, message, suggestion } = classifyPdfError(err);
          console.error('[UPLOAD_STAGE] pdf_page_limit_error', {
            reqId,
            code,
            err: err instanceof Error ? err.message : err,
            pdf_header: hasPdfHeader(parseBytes),
            bytes: parseBytes.byteLength,
          });
          trackProductEvent({ event: 'upload_failed', userId: user.id, code });
          return uploadReject(code, message, suggestion, 422, reqId);
        }

        console.log('[UPLOAD_STAGE] pdf_extract_start', { reqId });
        try {
          rawText = await extractText(parseBytes, {
            mimeType: file.type,
            fileNameHint: normalizedName,
            vercelId: vercelId ?? '',
            source: 'resume-upload',
            userId: user.id,
          });
        } catch (err) {
          const { code, message, suggestion } = classifyPdfError(err);
          console.error('[UPLOAD_STAGE] pdf_extract_error', {
            reqId,
            code,
            rejection_reason: code,
            pdf_header: hasPdfHeader(parseBytes),
            err: err instanceof Error ? err.message : err,
          });
          console.error(
            `[resume/upload][${reqId}] PDF parse failed vercel_id=${vercelId ?? 'n/a'} code=${code} size=${file.size} ext=${ext} parse_bytes=${parseBytes.byteLength} pdf_header=${hasPdfHeader(parseBytes)} name=${normalizedName}`,
          );
          trackProductEvent({ event: 'upload_failed', userId: user.id, code });
          return uploadReject(
            code,
            message,
            suggestion,
            422,
            reqId,
            vercelId ? { 'X-Vercel-Id': vercelId } : undefined,
          );
        }
        console.log('[UPLOAD_STAGE] pdf_extract_done', { reqId, chars: rawText.length });
      } else {
        console.log('[UPLOAD_STAGE] txt_decode_start', { reqId });
        rawText = new TextDecoder().decode(parseBytes);
        console.log('[UPLOAD_STAGE] txt_decode_done', { reqId, chars: rawText.length });
      }

      const layered = runLayeredTextExtraction(rawText);
      sanitizedRaw = layered.text;
      console.info('[UPLOAD_STAGE] extraction_pipeline', {
        reqId,
        stage: layered.stage,
        quality_band: layered.qualityBand,
        quality_score: layered.qualityScore,
        chars: sanitizedRaw.length,
      });

      if (!sanitizedRaw.trim()) {
        const m = RESUME_HARD_FAIL_MESSAGES.SCANNED_NO_TEXT;
        return uploadReject('SCANNED_NO_TEXT', m.userMessage, m.suggestion, 422, reqId);
      }

      if (isObviouslyGarbage(sanitizedRaw)) {
        const m = RESUME_HARD_FAIL_MESSAGES.GARBAGE_CONTENT;
        return uploadReject('GARBAGE_CONTENT', m.userMessage, m.suggestion, 422, reqId);
      }

      const resumeDocCheck = assertLooksLikeResume(sanitizedRaw);
      if (!resumeDocCheck.ok) {
        const m = RESUME_HARD_FAIL_MESSAGES.WRONG_DOCUMENT_TYPE;
        return uploadReject(
          'WRONG_DOCUMENT_TYPE',
          resumeDocCheck.message,
          m.suggestion,
          422,
          reqId,
        );
      }
    }

    const uploadExtractionWarning =
      !shouldBypassResumeParsePipeline() && sanitizedRaw.trim()
        ? (() => {
            const q = scoreExtractedText(sanitizedRaw);
            if (q.band === 'weak') {
              return 'We extracted most of your resume, but some sections may be incomplete.';
            }
            return undefined;
          })()
        : undefined;

    const timestamp = Date.now();
    const filePath = `resumes/${user.id}/${timestamp}${ext}`;
    const extForMime = ext === '.txt' ? '.txt' : '.pdf';
    const contentType = normalizedUploadContentType(file.type, extForMime);
    const uploadBytes = Buffer.from(arrayBuffer);

    console.log('[UPLOAD_STAGE] storage_upload_start', {
      reqId,
      bucket: RESUME_BUCKET,
      path: filePath,
      bytes: uploadBytes.length,
      contentType,
      mimeInput: file.type,
      ext,
    });

    const { error: storageError } = await serviceClient.storage
      .from(RESUME_BUCKET)
      .upload(filePath, uploadBytes, {
        contentType,
        upsert: false,
      });

    console.log('[UPLOAD_STAGE] storage_upload_result', {
      reqId,
      ok: !storageError,
      message: storageError?.message ?? null,
      storageError: storageError ? JSON.stringify(storageError) : null,
    });

    if (storageError) {
      const userMessage = classifyStorageError(storageError);
      return jsonWithReq(
        {
          error: userMessage,
          code: 'STORAGE_FAILED',
          ...(isUploadDiagnosticsEnabled()
            ? {
                stage: 'storage_upload',
                storageMessage: storageError.message,
                storageDetails: storageError as unknown as Record<string, unknown>,
              }
            : {}),
        },
        500,
        reqId,
      );
    }

    // Canonical object key for signed download (GET /api/resume/:id/file).
    // publicUrl / file_url below are deprecated dual-write for DB backward compatibility only.
    const {
      data: { publicUrl },
    } = serviceClient.storage.from(RESUME_BUCKET).getPublicUrl(filePath);

    if (shouldSkipResumeDbInsert()) {
      console.warn('[UPLOAD_STAGE] IE_UPLOAD_SKIP_DB active — skipping DB insert', { reqId, filePath, publicUrl });
      return jsonWithReq(
        {
          debugSkipDb: true,
          message: 'Storage upload OK; DB insert skipped (IE_UPLOAD_SKIP_DB=1).',
          storagePath: filePath,
          /** @deprecated Prefer storagePath + /api/resume/:id/file */
          publicUrl,
        },
        200,
        reqId,
      );
    }

    console.log('[UPLOAD_STAGE] db_write_start', { reqId, targetResumeId, uploadId });

    let resume: { id: string } | null = null;
    let writeError: { message?: string; code?: string } | null = null;

    if (targetResumeId) {
      const { data: owned, error: ownErr } = await serviceClient
        .from('resumes')
        .select('id')
        .eq('id', targetResumeId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (ownErr || !owned) {
        return jsonWithReq({ error: 'Resume not found', code: 'RESUME_NOT_FOUND' }, 404, reqId);
      }
      const { data: updated, error: updErr } = await serviceClient
        .from('resumes')
        .update({
          // Deprecated public URL — keep dual-writing; runtime access uses storage_path.
          file_url: publicUrl,
          storage_path: filePath,
          raw_text: sanitizedRaw,
          status: 'parsing',
          lifecycle_status: 'parsing',
          latest_upload_id: uploadId,
          parsed_data: null,
        })
        .eq('id', targetResumeId)
        .eq('user_id', user.id)
        .select('id')
        .single();
      resume = updated;
      writeError = updErr;
    } else {
      const { count: existingCount } = await serviceClient
        .from('resumes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      const makePrimary = (existingCount ?? 0) === 0;

      const { data: inserted, error: insertError } = await serviceClient
        .from('resumes')
        .insert({
          user_id: user.id,
          // Deprecated public URL — keep dual-writing; runtime access uses storage_path.
          file_url: publicUrl,
          storage_path: filePath,
          raw_text: sanitizedRaw,
          status: 'parsing',
          lifecycle_status: 'parsing',
          latest_upload_id: uploadId,
          is_primary: makePrimary,
        })
        .select('id')
        .single();
      resume = inserted;
      writeError = insertError;
    }

    console.log('[UPLOAD_STAGE] db_write_result', {
      reqId,
      ok: !writeError && !!resume,
      writeMessage: writeError?.message ?? null,
      writeCode: writeError?.code ?? null,
      resumeId: resume?.id ?? null,
      uploadId,
    });

    if (writeError || !resume) {
      const isFk =
        writeError?.code === '23503' ||
        (typeof writeError?.message === 'string' && writeError.message.includes('foreign key'));
      const base: Record<string, unknown> = {
        error: isFk
          ? 'Account data is out of sync with our database. Sign out and sign in again, then retry upload.'
          : 'Could not save your resume record. Please try again or contact support.',
        code: isFk ? 'FK_VIOLATION' : 'DB_INSERT_FAILED',
        requestId: reqId,
      };
      if (isUploadDiagnosticsEnabled()) {
        base.stage = 'db_write';
        base.insertError = writeError;
      }
      return jsonWithReq(base as Record<string, unknown>, 500, reqId);
    }

    console.log('[UPLOAD_STAGE] ok', {
      reqId,
      resume_id: resume.id,
      upload_id: uploadId,
      extraction_warning: uploadExtractionWarning ?? null,
      total_upload_ms: Date.now() - uploadStarted,
    });

    trackFunnelEvent(
      'resume_uploaded',
      {
        userId: user.id,
        resumeId: resume.id,
        source: 'api_resume_upload',
      },
      { ga4: false, attribution: getAttributionFromRequest(request) },
    );

    return jsonWithReq(
      {
        success: true,
        resumeId: resume.id,
        uploadId,
        status: 'parsing',
        lifecycleStatus: 'parsing',
        parsed: false,
        extractionWarning: uploadExtractionWarning,
      },
      200,
      reqId,
    );
  } catch (err) {
    console.error('[UPLOAD_STAGE] unhandled', {
      reqId,
      vercel_id: vercelId ?? 'n/a',
      stack: err instanceof Error ? err.stack : undefined,
    });
    const body = diagPayload('unhandled', err, reqId);
    return jsonWithReq(body, 500, reqId);
  }
}
