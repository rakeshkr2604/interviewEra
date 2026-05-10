import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { assertLooksLikeJobDescription } from '@/lib/documents/document-classification';
import { refineJobDescriptionForUi } from '@/lib/documents/job-description-clean';
import { enrichParsedJobDescriptionFromRaw } from '@/lib/documents/enrich-parsed-job-description';
import { parseJobDescription } from '@/lib/openai/parse-job-description';
import { sanitizeParsedJobDescription } from '@/lib/utils/sanitize-parsed-job-description';
import { safeText } from '@/lib/utils/sanitize';
import type { ParsedJobDescription } from '@/types/app.types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const bodySchema = z.object({
  text: z
    .string()
    .min(40)
    .max(12_000)
    .transform((s) => safeText(s, 12_000))
    .refine((s) => s.length >= 40, 'Text is too short.'),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = await checkRateLimit(`jdparse:${user.id}`, 300, 20);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many parse requests. Please wait a few minutes.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetInSeconds) } },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsedBody = bodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Invalid body' },
        { status: 400 },
      );
    }

    const refined = refineJobDescriptionForUi(parsedBody.data.text);
    const toValidate = refined.length >= 40 ? refined : parsedBody.data.text;
    const check = assertLooksLikeJobDescription(toValidate);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 422 });
    }

    let parsed: ParsedJobDescription;
    try {
      const aiParsed = await parseJobDescription(toValidate);
      const enriched = enrichParsedJobDescriptionFromRaw(toValidate, aiParsed);
      parsed = sanitizeParsedJobDescription(enriched);
    } catch (err) {
      console.error('[job-description/parse] AI error:', err);
      return NextResponse.json({ error: 'Could not structure this job description. Try again in a moment.' }, { status: 422 });
    }

    return NextResponse.json({ parsed });
  } catch (err) {
    console.error('[job-description/parse] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
