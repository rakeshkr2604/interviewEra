import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { assertLooksLikeJobDescription } from '@/lib/documents/document-classification';
import { safeText } from '@/lib/utils/sanitize';

const bodySchema = z.object({
  text: z
    .string()
    .min(12)
    .max(12_000)
    .transform((s) => safeText(s, 12_000))
    .refine((s) => s.length >= 12, 'Text is too short.'),
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid body' }, { status: 400 });
    }

    const check = assertLooksLikeJobDescription(parsed.data.text);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 422 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[job-description/validate] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
