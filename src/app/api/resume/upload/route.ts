import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseResume } from '@/lib/openai/parse-resume';
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

    // ── Step 7: AI parse resume (required for successful upload flow)
    let parsedData: Awaited<ReturnType<typeof parseResume>>;
    try {
      parsedData = await parseResume(rawText);
    } catch (err) {
      console.error('[resume/upload] AI parsing failed:', err);
      await supabase
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resume.id);
      return NextResponse.json(
        { error: 'Failed to parse resume. Please try again.' },
        { status: 422 }
      );
    }

    // ── Step 8: Update resume with parsed data
    const finalStatus = 'parsed';
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        parsed_data: parsedData,
        status: finalStatus,
      })
      .eq('id', resume.id);

    if (updateError) {
      console.error('[resume/upload] DB update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save resume data.' },
        { status: 500 }
      );
    }

    // ── Step 9: Return response ────────────────────────────────────────────────
    return NextResponse.json({
      resumeId: resume.id,
      status: finalStatus,
      parsed: true,
      parsedSummary: {
        name: parsedData.name,
        skills: parsedData.skills.slice(0, 10),
        targetRoles: parsedData.target_roles,
      },
    });
  } catch (err) {
    console.error('[resume/upload] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}
