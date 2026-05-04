import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import {
  extractText,
  normalizeFileName,
  PDFCorruptError,
  PDFEncryptedError,
  PDFScannedNoTextError,
  PDFUnsupportedError,
  type PDFErrorCode,
} from '@/lib/pdf/parser';

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
  CORRUPT: 'This file appears corrupt. Try re-saving and uploading again.',
  UNSUPPORTED: 'Unsupported file type. Use PDF or TXT.',
};

function classifyPdfError(err: unknown): { code: PDFErrorCode; message: string } {
  if (err instanceof PDFEncryptedError) return { code: 'ENCRYPTED', message: PDF_ERROR_MESSAGES.ENCRYPTED };
  if (err instanceof PDFScannedNoTextError) return { code: 'SCANNED_NO_TEXT', message: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT };
  if (err instanceof PDFCorruptError) return { code: 'CORRUPT', message: PDF_ERROR_MESSAGES.CORRUPT };
  if (err instanceof PDFUnsupportedError) return { code: 'UNSUPPORTED', message: PDF_ERROR_MESSAGES.UNSUPPORTED };
  return { code: 'CORRUPT', message: PDF_ERROR_MESSAGES.CORRUPT };
}

export async function POST(request: Request): Promise<NextResponse> {
  const reqId = randomUUID().slice(0, 8);
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

    // ── Step 3: Read bytes ONCE (storage upload + parser share the buffer) ───
    // Reading via formData detaches the underlying ArrayBuffer on some
    // runtimes — pull bytes here, then construct a fresh Blob for storage.
    const arrayBuffer = await file.arrayBuffer();

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
        { error: 'Failed to upload file. Please try again.' },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from('resumes').getPublicUrl(filePath);

    // ── Step 5: Create resume record ──────────────────────────────────────────
    const { data: resume, error: insertError } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, file_url: publicUrl, status: 'uploading' })
      .select()
      .single();

    if (insertError || !resume) {
      console.error(`[resume/upload][${reqId}] DB insert error:`, insertError?.message);
      return NextResponse.json(
        { error: 'Failed to create resume record.' },
        { status: 500 }
      );
    }

    // ── Step 6: Extract raw text ───────────────────────────────────────────────
    let rawText = '';

    if (ext === '.pdf') {
      try {
        rawText = await extractText(arrayBuffer);
      } catch (err) {
        const { code, message } = classifyPdfError(err);
        console.error(
          `[resume/upload][${reqId}] PDF parse failed code=${code} bytes=${arrayBuffer.byteLength} name=${normalizedName}`,
          err instanceof Error ? err.message : err,
        );
        await supabase
          .from('resumes')
          .update({ status: 'failed' })
          .eq('id', resume.id);
        return NextResponse.json({ error: message, code }, { status: 422 });
      }
    } else {
      rawText = new TextDecoder().decode(arrayBuffer);
    }

    if (!rawText.trim()) {
      await supabase
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resume.id);
      return NextResponse.json(
        {
          error: PDF_ERROR_MESSAGES.SCANNED_NO_TEXT,
          code: 'SCANNED_NO_TEXT' satisfies PDFErrorCode,
        },
        { status: 422 }
      );
    }

    // ── Step 7: Store raw_text ─────────────────────────────────────────────────
    await supabase
      .from('resumes')
      .update({ raw_text: rawText, status: 'parsing' })
      .eq('id', resume.id);

    // ── Step 8: Return resumeId immediately — AI parsing runs in /api/resume/parse
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
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
