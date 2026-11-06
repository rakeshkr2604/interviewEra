/**
 * GET  /api/resume-review — current user's quota for this billing cycle + request history.
 * POST /api/resume-review — create a resume-review session request (Starter/Pro only).
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { resolveResumeReviewQuota } from '@/lib/resume-review/quota';
import { checkRateLimit, buildRateLimitHttpResponse } from '@/lib/redis/rate-limit';

export type ResumeReviewRequestRow = {
  id: string;
  resume_id: string | null;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
};

const SELECT_COLS = 'id, resume_id, status, notes, scheduled_at, completed_at, created_at';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = createServiceClient();
    const quotaResult = await resolveResumeReviewQuota(serviceClient, user.id);
    if (!quotaResult.ok) {
      return NextResponse.json({ error: quotaResult.error }, { status: 500 });
    }

    const { data: requests, error: listError } = await serviceClient
      .from('resume_review_requests')
      .select(SELECT_COLS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (listError) {
      console.error('[resume-review] GET list failed:', listError.message);
      return NextResponse.json({ error: 'Failed to load requests.' }, { status: 500 });
    }

    return NextResponse.json({
      quota: quotaResult.quota,
      requests: (requests ?? []) as ResumeReviewRequestRow[],
    });
  } catch (err) {
    console.error('[resume-review] GET unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const postSchema = z.object({
  resumeId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
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

    // Cheap abuse guard — this is a human-fulfilled perk, not a hot endpoint.
    const rateLimit = await checkRateLimit(`resume-review:${user.id}`, 60, 10);
    const blocked = buildRateLimitHttpResponse(
      rateLimit,
      'Too many requests. Please wait a moment and try again.',
    );
    if (blocked) {
      return NextResponse.json(blocked.body, { status: blocked.status, headers: blocked.headers });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      rawBody = {};
    }
    const parsed = postSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();
    const quotaResult = await resolveResumeReviewQuota(serviceClient, user.id);
    if (!quotaResult.ok) {
      return NextResponse.json({ error: quotaResult.error }, { status: 500 });
    }
    const { quota } = quotaResult;

    if (!quota.eligible) {
      return NextResponse.json(
        {
          error:
            'Resume review sessions are a Starter/Pro perk. Upgrade your plan to request one.',
          code: 'NOT_ELIGIBLE',
        },
        { status: 403 },
      );
    }
    if (quota.remaining <= 0) {
      return NextResponse.json(
        {
          error: `You've used all ${quota.allowance} resume review request(s) for this billing cycle.`,
          code: 'QUOTA_EXCEEDED',
        },
        { status: 409 },
      );
    }

    const resumeId = parsed.data.resumeId ?? null;
    if (resumeId) {
      const { data: resume, error: resumeError } = await serviceClient
        .from('resumes')
        .select('id, deleted_at, storage_path')
        .eq('id', resumeId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (resumeError || !resume || resume.deleted_at) {
        return NextResponse.json({ error: 'Resume not found for this account.' }, { status: 403 });
      }
      const hasFile =
        typeof resume.storage_path === 'string' && resume.storage_path.trim().length > 0;
      if (!hasFile) {
        return NextResponse.json({ error: 'That resume has no file on record.' }, { status: 400 });
      }
    }

    const { data: inserted, error: insertError } = await serviceClient
      .from('resume_review_requests')
      .insert({
        user_id: user.id,
        resume_id: resumeId,
        plan_tier: quota.planTier,
        cycle_start: quota.cycleStart,
        notes: parsed.data.notes || null,
      })
      .select(SELECT_COLS)
      .single();

    if (insertError) {
      // Trigger-enforced quota race (two concurrent requests) — same outward
      // shape as the pre-check above so the client handles it identically.
      if (
        insertError.message?.includes('resume_review_quota_exceeded') ||
        insertError.code === 'P0001'
      ) {
        return NextResponse.json(
          {
            error: `You've used all ${quota.allowance} resume review request(s) for this billing cycle.`,
            code: 'QUOTA_EXCEEDED',
          },
          { status: 409 },
        );
      }
      console.error('[resume-review] insert failed:', insertError.message);
      return NextResponse.json({ error: 'Could not submit your request.' }, { status: 500 });
    }

    return NextResponse.json({ request: inserted as ResumeReviewRequestRow }, { status: 201 });
  } catch (err) {
    console.error('[resume-review] POST unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
