import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { PDFParse } from 'pdf-parse';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.txt']);

export async function POST(request: Request): Promise<NextResponse> {
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

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds 5 MB limit' },
        { status: 400 }
      );
    }

    const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`;
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: 'Only PDF and TXT files are supported. Please upload a PDF for best results.' },
        { status: 400 }
      );
    }

    // ── Step 3: Upload to Supabase Storage ────────────────────────────────────
    const serviceClient = createServiceClient();
    const timestamp = Date.now();
    const filePath = `resumes/${user.id}/${timestamp}${ext}`;

    const { error: storageError } = await serviceClient.storage
      .from('resumes')
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (storageError) {
      console.error('[resume/upload] Storage error:', storageError);
      return NextResponse.json(
        { error: 'Failed to upload file. Please try again.' },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = serviceClient.storage.from('resumes').getPublicUrl(filePath);

    // ── Step 4: Create resume record ──────────────────────────────────────────
    const { data: resume, error: insertError } = await supabase
      .from('resumes')
      .insert({ user_id: user.id, file_url: publicUrl, status: 'uploading' })
      .select()
      .single();

    if (insertError || !resume) {
      console.error('[resume/upload] DB insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create resume record.' },
        { status: 500 }
      );
    }

    // ── Step 5: Extract raw text ───────────────────────────────────────────────
    let rawText = '';

    if (ext === '.pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parser = new PDFParse({ data: arrayBuffer });
        try {
          const textResult = await parser.getText();
          rawText = textResult.text;
        } finally {
          await parser.destroy();
        }
      } catch (err) {
        console.error('[resume/upload] PDF parse error:', err);
        await supabase
          .from('resumes')
          .update({ status: 'failed' })
          .eq('id', resume.id);
        return NextResponse.json(
          { error: 'Failed to extract text from PDF. Ensure the file is not encrypted.' },
          { status: 422 }
        );
      }
    } else {
      rawText = await file.text();
    }

    if (!rawText.trim()) {
      await supabase
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resume.id);
      return NextResponse.json(
        { error: 'File appears to be empty or unreadable.' },
        { status: 422 }
      );
    }

    // ── Step 6: Store raw_text ─────────────────────────────────────────────────
    await supabase
      .from('resumes')
      .update({ raw_text: rawText, status: 'parsing' })
      .eq('id', resume.id);

    // ── Step 7: Return resumeId immediately — AI parsing runs in /api/resume/parse
    // This keeps the upload handler well under the serverless timeout limit.
    return NextResponse.json({
      resumeId: resume.id,
      status: 'parsing',
      parsed: false,
    });
  } catch (err) {
    console.error('[resume/upload] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
