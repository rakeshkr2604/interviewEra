import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';
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

    // ── LLM cost guard ────────────────────────────────────────────────────────
    const serviceClient = createServiceClient();
    const { data: userProfile } = await serviceClient
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();
    const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
    const jdParseCost = estimateLLMCallCostUSD('jd_parse');
    const jdCostGuard = await checkLLMCostGuard(user.id, planTier, jdParseCost, 'jd_parse');
    if (!jdCostGuard.allowed) {
      return NextResponse.json(
        { error: 'Monthly AI usage limit reached. Please upgrade your plan or try again next month.' },
        { status: 429 },
      );
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

    // Record spend after successful parse (fire-and-forget)
    void recordLLMSpend(user.id, jdParseCost);

    return NextResponse.json({ parsed });
  } catch (err) {
    console.error('[job-description/parse] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
