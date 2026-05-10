import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
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
import { assertLooksLikeResume } from '@/lib/documents/document-classification';
import { getMultipleFilesError } from '@/lib/http/form-data-single-file';
import { normalizeExtractedDocumentText } from '@/lib/utils/sanitize';

// pdfjs-dist is a Node-only library (Buffer + node:module). Pin the
// runtime explicitly — never ship this on Edge, where the module would
// fail to evaluate and we'd surface a generic 500 instead of CORRUPT.
export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

const PDF_ERROR_MESSAGES: Record<PDFErrorCode, string> = {
  ENCRYPTED: 'This PDF is password-protected. Remove the password and re-upload.',
  SCANNED_NO_TEXT:
    'This PDF appears to be scanned. Upload a text-based PDF or a .txt export.',
  CORRUPT:
    'This PDF could not be read as valid. If it opens on your laptop, export it again (“Save as PDF”) and re-upload.',
  UNSUPPORTED: 'Unsupported file type. Use PDF or TXT.',
};

type ResumeUploadPdfErrorCode =
  PDFErrorCode
  | 'PARSER_UNAVAILABLE'
  | 'PARSER_RUNTIME';

const PDF_PARSER_INFRA_MESSAGES: Pick<
  Record<ResumeUploadPdfErrorCode, string>,
  'PARSER_UNAVAILABLE' | 'PARSER_RUNTIME'
> = {
  PARSER_UNAVAILABLE: 'Resume parser is temporarily unavailable. Please retry in a minute.',
  PARSER_RUNTIME:
    'Could not finish reading this PDF on our servers yet. Retry once — if it persists, re-export as PDF from Word/Canva or upload a .txt resume.',
};

function classifyPdfError(err: unknown): { code: ResumeUploadPdfErrorCode; message: string } {
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

function hasPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  const scanLimit = Math.min(bytes.byteLength - 5, 1024);
  for (let i = 0; i <= scanLimit; i++) {
    if (
      bytes[i] === 0x25 && // %
      bytes[i + 1] === 0x50 && // P
      bytes[i + 2] === 0x44 && // D
      bytes[i + 3] === 0x46 && // F
      bytes[i + 4] === 0x2d // -
    ) {
      return true;
    }
  }
  return false;
}

export async function POST(request: Request): Promise<NextResponse> {
  const reqId = randomUUID().slice(0, 8);
  const vercelId = request.headers.get('x-vercel-id');
  try {
    // ── Step 1: Authenticate user ─────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Rate limiting (5 uploads / 5 min per user) ────────────────────────────
    const rateLimit = await checkRateLimit(`upload:${user.id}`, 300, 5);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please wait a few minutes before trying again.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetInSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ── Step 2: Validate file ──────────────────────────────────────────────────
    const formData = await request.formData();
    const multiErr = getMultipleFilesError(formData, 'file');
    if (multiErr) {
      return NextResponse.json({ error: multiErr }, { status: 400 });
    }
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 5 MB limit' },
        { status: 400 }
      );
    }

    // Some browsers (especially Save-As / Send-To-PDF flows) emit a
    // double `.pdf.pdf` extension. Strip it before extension validation.
    const normalizedName = normalizeFileName(file.name);
    const ext = `.${normalizedName.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Only PDF and TXT files are supported. Please upload a PDF for best results.' },
        { status: 400 }
      );
    }

    // ── Step 3: Read bytes once and parse from an immutable copy ──────────────
    const arrayBuffer = await file.arrayBuffer();
    const parseBytes = new Uint8Array(arrayBuffer).slice();

    let rawText = '';
    if (ext === '.pdf') {
      try {
        rawText = await extractText(parseBytes, {
          mimeType: file.type,
          fileNameHint: normalizedName,
          vercelId: vercelId ?? '',
          source: 'resume-upload',
        });
      } catch (err) {
        const { code, message } = classifyPdfError(err);
        console.error(
          `[resume/upload][${reqId}] PDF parse failed vercel_id=${vercelId ?? 'n/a'} code=${code} size=${file.size} ext=${ext} parse_bytes=${parseBytes.byteLength} pdf_header=${hasPdfHeader(parseBytes)} name=${normalizedName}`,
          err instanceof Error ? err.message : err,
        );
        console.error(
          `[resume/upload][${reqId}] grep logs: [pdf-parse][diag] [pdf-parse][attempt] x-vercel-id=${vercelId ?? 'n/a'}`,
        );
        return NextResponse.json(
          { error: message, code, requestId: reqId },
          {
            status: 422,
            headers: {
              'X-Request-Id': reqId,
              ...(vercelId ? { 'X-Vercel-Id': vercelId } : {}),
            },
          },
        );
      }
    } else {
      rawText = new TextDecoder().decode(parseBytes);
    }

    const sanitizedRaw = normalizeExtractedDocumentText(rawText, 400_000);
    if (!sanitizedRaw.trim()) {
      return NextResponse.json(
        {
          error: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT,
          code: 'SCANNED_NO_TEXT' satisfies PDFErrorCode,
          requestId: reqId,
        },
        { status: 422, headers: { 'X-Request-Id': reqId } }
      );
    }

    const resumeDocCheck = assertLooksLikeResume(sanitizedRaw);
    if (!resumeDocCheck.ok) {
      return NextResponse.json(
        { error: resumeDocCheck.message, code: 'WRONG_DOCUMENT_TYPE', requestId: reqId },
        { status: 422, headers: { 'X-Request-Id': reqId } },
      );
    }

    // ── Step 4: Upload to Supabase Storage ────────────────────────────────────
    const serviceClient = createServiceClient();
    const timestamp = Date.now();
    const filePath = `resumes/${user.id}/${timestamp}${ext}`;

    const { error: storageError } = await serviceClient.storage
      .from('resumes')
      .upload(filePath, new Blob([arrayBuffer], { type: file.type || 'application/octet-stream' }), {
        contentType: file.type || (ext === '.pdf' ? 'application/pdf' : 'text/plain'),
        upsert: false,
      });

    if (storageError) {
      console.error(`[resume/upload][${reqId}] Storage error:`, storageError.message);
      return NextResponse.json(
        {
          error:
            'Could not store the file. Check your connection and retry. If this continues, your storage bucket may need configuration.',
          code: 'STORAGE_FAILED',
          requestId: reqId,
        },
        { status: 500, headers: { 'X-Request-Id': reqId } },
      );
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from('resumes').getPublicUrl(filePath);

    // ── Step 5: Create resume record with extracted text ──────────────────────
    const { data: resume, error: insertError } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, file_url: publicUrl, raw_text: sanitizedRaw, status: 'parsing' })
      .select()
      .single();

    if (insertError || !resume) {
      console.error(`[resume/upload][${reqId}] DB insert error:`, insertError?.message);
      return NextResponse.json(
        {
          error: 'Could not save your resume record. Please try again or contact support.',
          code: 'DB_INSERT_FAILED',
          requestId: reqId,
        },
        { status: 500, headers: { 'X-Request-Id': reqId } },
      );
    }

    // ── Step 6: Return resumeId immediately — AI parsing runs in /api/resume/parse
    // This keeps the upload handler well under the serverless timeout limit.
    return NextResponse.json({
      resumeId: resume.id,
      status: 'parsing',
      parsed: false,
    });
  } catch (err) {
    console.error(
      `[resume/upload][${reqId}] Unexpected error:`,
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: 'Something went wrong on our side. Please try again.', code: 'INTERNAL', requestId: reqId },
      { status: 500, headers: { 'X-Request-Id': reqId } },
    );
  }
}
