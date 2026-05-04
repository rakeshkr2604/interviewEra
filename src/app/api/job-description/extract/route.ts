import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import {
  extractText,
  normalizeFileName,
  PDFCorruptError,
  PDFEncryptedError,
  PDFParserUnavailableError,
  PDFScannedNoTextError,
  PDFUnsupportedError,
  type PDFErrorCode,
} from '@/lib/pdf/parser';
import { assertLooksLikeJobDescription } from '@/lib/documents/document-classification';
import { getMultipleFilesError } from '@/lib/http/form-data-single-file';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

const PDF_ERROR_MESSAGES: Record<PDFErrorCode, string> = {
  ENCRYPTED: 'This PDF is password-protected. Remove the password and try again.',
  SCANNED_NO_TEXT:
    'This PDF appears to be scanned. Paste the JD as text or upload a text-based PDF.',
  CORRUPT: 'This file appears corrupt. Try re-saving and uploading again.',
  UNSUPPORTED: 'Unsupported file type. Use PDF or TXT.',
};

type PdfErr = PDFErrorCode | 'PARSER_UNAVAILABLE';

function classifyPdfError(err: unknown): { code: PdfErr; message: string } {
  if (err instanceof PDFParserUnavailableError) {
    return {
      code: 'PARSER_UNAVAILABLE',
      message: 'PDF parser is temporarily unavailable. Please retry in a minute.',
    };
  }
  if (err instanceof PDFEncryptedError) return { code: 'ENCRYPTED', message: PDF_ERROR_MESSAGES.ENCRYPTED };
  if (err instanceof PDFScannedNoTextError) return { code: 'SCANNED_NO_TEXT', message: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT };
  if (err instanceof PDFCorruptError) return { code: 'CORRUPT', message: PDF_ERROR_MESSAGES.CORRUPT };
  if (err instanceof PDFUnsupportedError) return { code: 'UNSUPPORTED', message: PDF_ERROR_MESSAGES.UNSUPPORTED };
  return { code: 'CORRUPT', message: PDF_ERROR_MESSAGES.CORRUPT };
}

export async function POST(request: Request): Promise<NextResponse> {
  const reqId = randomUUID().slice(0, 8);
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json({ error: 'File must be non-empty and under 5 MB.' }, { status: 400 });
    }

    const normalizedName = normalizeFileName(file.name);
    const ext = `.${normalizedName.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json({ error: 'Only PDF and TXT files are supported.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const parseBytes = new Uint8Array(arrayBuffer).slice();

    let rawText = '';
    if (ext === '.pdf') {
      try {
        rawText = await extractText(parseBytes);
      } catch (err) {
        const { message } = classifyPdfError(err);
        console.error(`[job-description/extract][${reqId}] PDF parse failed`, err);
        return NextResponse.json({ error: message, requestId: reqId }, { status: 422 });
      }
    } else {
      rawText = new TextDecoder().decode(parseBytes);
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT, requestId: reqId },
        { status: 422 },
      );
    }

    const jdCheck = assertLooksLikeJobDescription(rawText);
    if (!jdCheck.ok) {
      return NextResponse.json({ error: jdCheck.message, code: 'WRONG_DOCUMENT_TYPE', requestId: reqId }, { status: 422 });
    }

    const clipped = rawText.trim().slice(0, 12_000);
    return NextResponse.json({ text: clipped, requestId: reqId });
  } catch (err) {
    console.error(`[job-description/extract][${reqId}] Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
