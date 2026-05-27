import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';
import { parseResumeGracefully } from '@/lib/resume/graceful-parse';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { scoreExtractedText } from '@/lib/resume/extraction-quality';
import { resumeUserError } from '@/lib/resume/parse-outcome';
import { trackProductEvent } from '@/lib/analytics/product-events';

export const maxDuration = 60;

export async function POST(request: Request): Promise<NextResponse> {
  const routeStart = Date.now();
  try {
    const body = (await request.json()) as { resumeId?: string };
    const resumeId = body.resumeId;

    if (!resumeId) {
      return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('id, raw_text, status, user_id')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    if (resume.status === 'parsed') {
      return NextResponse.json({ status: 'parsed', success: true });
    }

    const rawText = resume.raw_text?.trim() ?? '';
    if (!rawText) {
      await createServiceClient()
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resumeId);
      const err = resumeUserError(
        'NO_RAW_TEXT',
        'We could not find readable text for this resume.',
        'Re-upload a text-based PDF or paste your resume as plain text.',
      );
      return NextResponse.json(err, { status: 422 });
    }

    const textQuality = scoreExtractedText(rawText);
    if (textQuality.band === 'unusable') {
      await createServiceClient()
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resumeId);
      const err = resumeUserError(
        'GARBAGE_CONTENT',
        'The upload completed, but the resume content was unclear.',
        'Use a standard resume PDF or a .txt export from your editor.',
      );
      trackProductEvent({ event: 'parse_failed', userId: user.id, resumeId, code: 'GARBAGE_CONTENT' });
      console.warn('[resume/parse] reject', {
        resumeId,
        reason: 'GARBAGE_CONTENT',
        qualityScore: textQuality.score,
        band: textQuality.band,
      });
      return NextResponse.json(err, { status: 422 });
    }

    const serviceClientForGuard = createServiceClient();
    const resumeParseCost = estimateLLMCallCostUSD('resume_parse');
    const { data: userProfile } = await serviceClientForGuard
      .from('users')
      .select('plan_tier')
      .eq('id', user.id)
      .single();
    const planTier = (userProfile?.plan_tier as string | undefined) ?? 'free';
    const resumeCostGuard = await checkLLMCostGuard(user.id, planTier, resumeParseCost, 'resume_parse');
    if (!resumeCostGuard.allowed) {
      return NextResponse.json(
        { error: 'Monthly AI usage limit reached. Please upgrade your plan or try again next month.' },
        { status: 429 },
      );
    }

    let parseResult: Awaited<ReturnType<typeof parseResumeGracefully>>;
    try {
      parseResult = await parseResumeGracefully(rawText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[resume/parse] graceful parse failed:', { resumeId, msg });
      await createServiceClient()
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resumeId);
      const userErr = resumeUserError(
        'AI_PARSE_FAILED',
        'We could not structure this resume right now.',
        'Try again in a moment, or upload a simpler PDF or .txt file.',
      );
      return NextResponse.json(userErr, { status: 422 });
    }

    const profile = coerceParsedResume(parseResult.data);

    const { error: updateError } = await createServiceClient()
      .from('resumes')
      .update({ parsed_data: profile, status: 'parsed' })
      .eq('id', resumeId);

    if (updateError) {
      console.error('[resume/parse] DB update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save parsed data.' },
        { status: 500 },
      );
    }

    void recordLLMSpend(user.id, resumeParseCost);

    if (parseResult.stage !== 'ai_full') {
      trackProductEvent({
        event: 'parse_degraded',
        userId: user.id,
        resumeId,
        quality: parseResult.quality,
        stage: parseResult.stage,
      });
    } else if (parseResult.quality !== 'full') {
      trackProductEvent({
        event: 'parse_degraded',
        userId: user.id,
        resumeId,
        quality: parseResult.quality,
        stage: parseResult.stage,
      });
    }

    console.info('[resume/parse] ok', {
      resumeId,
      quality: parseResult.quality,
      stage: parseResult.stage,
      extractionScore: textQuality.score,
      degraded: parseResult.quality !== 'full',
      routeMs: Date.now() - routeStart,
      pipeline: parseResult.timing,
    });

    return NextResponse.json({
      success: true,
      status: 'parsed',
      parseQuality: parseResult.quality,
      parseWarning: parseResult.warning,
      parsedSummary: {
        targetRole: profile.target_role,
        skills: profile.skills.slice(0, 8),
        experienceEstimate: profile.experience_estimate,
      },
    });
  } catch (err) {
    console.error('[resume/parse] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
