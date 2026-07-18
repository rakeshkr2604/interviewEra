import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkLLMCostGuard, estimateLLMCallCostUSD, recordLLMSpend } from '@/lib/ai/llm-cost-guard';
import { parseResumeGracefully } from '@/lib/resume/graceful-parse';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { scoreExtractedText } from '@/lib/resume/extraction-quality';
import { resumeUserError } from '@/lib/resume/parse-outcome';
import { trackProductEvent } from '@/lib/analytics/product-events';
import { canonicalizeSkills } from '@/lib/resume/skill-canonicalize';
import { commitParseVersion } from '@/lib/resume/version-write';
import { createVersionWriteDb } from '@/lib/resume/version-write-supabase';
import { RESUME_PARSER_VERSION } from '@/lib/resume/parser-version';

export const maxDuration = 60;

const PARSE_TIMEOUT_MS = 45_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('PARSE_TIMEOUT')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const routeStart = Date.now();
  try {
    const body = (await request.json()) as { resumeId?: string; uploadId?: string };
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

    const serviceClient = createServiceClient();
    const { data: resume, error: fetchError } = await serviceClient
      .from('resumes')
      .select('id, raw_text, status, user_id, latest_upload_id, storage_path, file_url, lifecycle_status, current_version_id')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    // Idempotent: already has a version for this upload (or legacy parsed with no pending upload)
    if (resume.status === 'parsed' && resume.current_version_id && !body.uploadId) {
      return NextResponse.json({ status: 'parsed', success: true, lifecycleStatus: resume.lifecycle_status });
    }

    let uploadId =
      (typeof body.uploadId === 'string' && body.uploadId) ||
      (resume.latest_upload_id as string | null) ||
      null;

    // Recover pre-migration / stuck rows with no upload_id
    if (!uploadId) {
      uploadId = randomUUID();
      await serviceClient
        .from('resumes')
        .update({
          latest_upload_id: uploadId,
          status: 'parsing',
          lifecycle_status: 'parsing',
        })
        .eq('id', resumeId)
        .eq('user_id', user.id);
    }

    const rawText = resume.raw_text?.trim() ?? '';
    if (!rawText) {
      await serviceClient
        .from('resumes')
        .update({ status: 'failed', lifecycle_status: 'parse_failed' })
        .eq('id', resumeId)
        .eq('latest_upload_id', uploadId);
      const err = resumeUserError(
        'NO_RAW_TEXT',
        'We could not find readable text for this resume.',
        'Re-upload a text-based PDF or paste your resume as plain text.',
      );
      return NextResponse.json(err, { status: 422 });
    }

    const textQuality = scoreExtractedText(rawText);
    if (textQuality.band === 'unusable') {
      await serviceClient
        .from('resumes')
        .update({ status: 'failed', lifecycle_status: 'parse_failed' })
        .eq('id', resumeId)
        .eq('latest_upload_id', uploadId);
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

    const resumeParseCost = estimateLLMCallCostUSD('resume_parse');
    const { data: userProfile } = await serviceClient
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

    await serviceClient
      .from('resumes')
      .update({ status: 'parsing', lifecycle_status: 'parsing' })
      .eq('id', resumeId)
      .eq('latest_upload_id', uploadId);

    let parseResult: Awaited<ReturnType<typeof parseResumeGracefully>>;
    try {
      parseResult = await withTimeout(parseResumeGracefully(rawText), PARSE_TIMEOUT_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = msg === 'PARSE_TIMEOUT';
      console.error('[resume/parse] graceful parse failed:', { resumeId, msg, isTimeout });

      // Only mark failed if this upload is still latest
      await serviceClient
        .from('resumes')
        .update({ status: 'failed', lifecycle_status: 'parse_failed' })
        .eq('id', resumeId)
        .eq('latest_upload_id', uploadId);

      if (isTimeout) {
        const userErr = resumeUserError(
          'PARSE_TIMEOUT',
          'Resume parsing timed out.',
          'Please re-upload — smaller PDFs or .txt files parse more reliably.',
        );
        trackProductEvent({ event: 'parse_failed', userId: user.id, resumeId, code: 'PARSE_TIMEOUT' });
        return NextResponse.json(userErr, { status: 422 });
      }

      const userErr = resumeUserError(
        'AI_PARSE_FAILED',
        'We could not structure this resume right now.',
        'Try again in a moment, or upload a simpler PDF or .txt file.',
      );
      return NextResponse.json(userErr, { status: 422 });
    }

    const profile = coerceParsedResume(parseResult.data);
    const skillsExtracted = canonicalizeSkills(profile.skills);
    const canonicalProfile = {
      ...profile,
      skills: skillsExtracted.map((s) => s.canonical),
    };

    const db = createVersionWriteDb(serviceClient);
    const commit = await commitParseVersion(db, {
      resumeId,
      userId: user.id,
      uploadId,
      parsed: canonicalProfile,
      skillsExtracted,
      rawText,
      storagePath: (resume.storage_path as string | null) ?? null,
      fileUrl: (resume.file_url as string | null) ?? null,
      parserVersion: RESUME_PARSER_VERSION,
    });

    if (!commit.ok) {
      if (commit.reason === 'stale_upload') {
        return NextResponse.json({
          success: true,
          status: 'superseded',
          discarded: true,
          message: 'A newer upload or edit replaced this parse; result discarded.',
        });
      }
      if (commit.reason === 'already_committed' && commit.version) {
        return NextResponse.json({
          success: true,
          status: 'parsed',
          lifecycleStatus: 'review_ready',
          versionId: commit.version.id,
          versionNumber: commit.version.version_number,
        });
      }
      return NextResponse.json({ error: 'Failed to save parsed data.' }, { status: 500 });
    }

    void recordLLMSpend(user.id, resumeParseCost);

    if (parseResult.stage !== 'ai_full' || parseResult.quality !== 'full') {
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
      uploadId,
      versionId: commit.version.id,
      versionNumber: commit.version.version_number,
      parserVersion: RESUME_PARSER_VERSION,
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
      lifecycleStatus: 'review_ready',
      uploadId,
      versionId: commit.version.id,
      versionNumber: commit.version.version_number,
      parserVersion: RESUME_PARSER_VERSION,
      parseQuality: parseResult.quality,
      parseWarning: parseResult.warning,
      parsedSummary: {
        targetRole: canonicalProfile.target_role,
        skills: canonicalProfile.skills.slice(0, 8),
        experienceEstimate: canonicalProfile.experience_estimate,
      },
    });
  } catch (err) {
    console.error('[resume/parse] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
