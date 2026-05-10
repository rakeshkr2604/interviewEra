import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
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
import { assertLooksLikeJobDescription } from '@/lib/documents/document-classification';
import { refineJobDescriptionForUi } from '@/lib/documents/job-description-clean';
import { getMultipleFilesError } from '@/lib/http/form-data-single-file';
import { MULTIPART_UPLOAD_MAX_BYTES } from '@/lib/http/upload-limits';
import { safeText } from '@/lib/utils/sanitize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_FILE_SIZE = MULTIPART_UPLOAD_MAX_BYTES;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

const PDF_ERROR_MESSAGES: Record<PDFErrorCode, string> = {
  ENCRYPTED: 'This PDF is password-protected. Remove the password and try again.',
  SCANNED_NO_TEXT:
    'This PDF appears to be scanned. Paste the JD as text or upload a text-based PDF.',
  CORRUPT:
    'This PDF could not be read. Try exporting the JD as PDF again, or paste plain text.',
  UNSUPPORTED: 'Unsupported file type. Use PDF or TXT.',
};

type PdfErr = PDFErrorCode | 'PARSER_UNAVAILABLE' | 'PARSER_RUNTIME';

const PDF_PARSER_INFRA_MESSAGES: Record<'PARSER_UNAVAILABLE' | 'PARSER_RUNTIME', string> = {
  PARSER_UNAVAILABLE: 'PDF parser is temporarily unavailable. Please retry in a minute.',
  PARSER_RUNTIME:
    'Could not finish reading this PDF on our servers. Retry once, or paste the JD as plain text.',
};

function classifyPdfError(err: unknown): { code: PdfErr; message: string } {
  if (err instanceof PDFParserUnavailableError) {
    return {
      code: 'PARSER_UNAVAILABLE',
      message: PDF_PARSER_INFRA_MESSAGES.PARSER_UNAVAILABLE,
    };
  }
  if (err instanceof PDFParserRuntimeError) {
    return { code: 'PARSER_RUNTIME', message: PDF_PARSER_INFRA_MESSAGES.PARSER_RUNTIME };
  }
  if (err instanceof PDFEncryptedError) return { code: 'ENCRYPTED', message: PDF_ERROR_MESSAGES.ENCRYPTED };
  if (err instanceof PDFScannedNoTextError) return { code: 'SCANNED_NO_TEXT', message: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT };
  if (err instanceof PDFCorruptError) return { code: 'CORRUPT', message: PDF_ERROR_MESSAGES.CORRUPT };
  if (err instanceof PDFUnsupportedError) return { code: 'UNSUPPORTED', message: PDF_ERROR_MESSAGES.UNSUPPORTED };
  return { code: 'PARSER_RUNTIME', message: PDF_PARSER_INFRA_MESSAGES.PARSER_RUNTIME };
}

export async function POST(request: Request): Promise<NextResponse> {
  const reqId = randomUUID().slice(0, 8);
  const vercelReqIdHeader = request.headers.get('x-vercel-id');
  const cl = request.headers.get('content-length');
  console.log('[JD_EXTRACT_STAGE] request_start', {
    reqId,
    vercel_id: vercelReqIdHeader ?? 'n/a',
    content_length: cl ?? 'missing',
  });
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn(`[job-description/extract][${reqId}] auth failed`, authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED', requestId: reqId },
        { status: 401, headers: { 'X-Request-Id': reqId } },
      );
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
      console.error(`[job-description/extract][${reqId}] missing public Supabase env`);
      return NextResponse.json(
        { error: 'Service unavailable.', code: 'SERVER_CONFIG', requestId: reqId },
        { status: 503, headers: { 'X-Request-Id': reqId } },
      );
    }

    const rateLimit = await checkRateLimit(`jdextract:${user.id}`, 300, 10);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a few minutes before trying again.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.resetInSeconds) },
        },
      );
    }

    const formData = await request.formData();
    const multiErr = getMultipleFilesError(formData, 'file');
    if (multiErr) {
      return NextResponse.json({ error: multiErr }, { status: 400 });
    }
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File must be non-empty and under ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))} MB.`,
          code: 'FILE_TOO_LARGE',
          requestId: reqId,
        },
        { status: 400, headers: { 'X-Request-Id': reqId } },
      );
    }

    const normalizedName = normalizeFileName(file.name);
    const ext = `.${normalizedName.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'Only PDF and TXT files are supported.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parseBytes = new Uint8Array(arrayBuffer).slice();

    console.info(
      `[job-description/extract][${reqId}] stage=read vercel_id=${vercelReqIdHeader ?? 'n/a'} user=${user.id.slice(0, 8)} bytes=${parseBytes.byteLength} ext=${ext} mime=${(file.type || '').slice(0, 48)}`,
    );

    let rawText = '';
    if (ext === '.pdf') {
      try {
        rawText = await extractText(parseBytes, {
          mimeType: file.type,
          fileNameHint: normalizedName,
          vercelId: vercelReqIdHeader ?? '',
          source: 'job-description-extract',
        });
      } catch (err) {
        const { message, code } = classifyPdfError(err);
        console.error(`[job-description/extract][${reqId}] stage=pdf_error code=${code}`, err);
        return NextResponse.json(
          { error: message, code, requestId: reqId },
          { status: 422, headers: { 'X-Request-Id': reqId } },
        );
      }
    } else {
      rawText = new TextDecoder().decode(parseBytes);
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT, code: 'SCANNED_NO_TEXT', requestId: reqId },
        { status: 422, headers: { 'X-Request-Id': reqId } },
      );
    }

    const jdCheck = assertLooksLikeJobDescription(rawText);
    if (!jdCheck.ok) {
      return NextResponse.json(
        { error: jdCheck.message, code: 'WRONG_DOCUMENT_TYPE', requestId: reqId },
        { status: 422, headers: { 'X-Request-Id': reqId } },
      );
    }

    const refined = refineJobDescriptionForUi(rawText);
    const clipped = safeText(refined, 12_000);
    console.info(`[job-description/extract][${reqId}] stage=ok chars=${clipped.length}`);
    return NextResponse.json({ text: clipped, requestId: reqId }, { headers: { 'X-Request-Id': reqId } });
  } catch (err) {
    console.error(`[job-description/extract][${reqId}] stage=unhandled vercel_id=${vercelReqIdHeader ?? 'n/a'}`, err);
    return NextResponse.json(
      {
        error: 'Something went wrong on our side. Please try again.',
        code: 'INTERNAL',
        requestId: reqId,
      },
      { status: 500, headers: { 'X-Request-Id': reqId } },
    );
  }
}
