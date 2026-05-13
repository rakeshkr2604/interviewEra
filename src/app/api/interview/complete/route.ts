import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { aggregateReport } from '@/lib/utils/report';
import { interviewCompleteSchema } from '@/lib/validations/schemas';
import {
  computeNextTierProgressPercent,
  formatProgressMessage,
} from '@/lib/retention/format-progress-message';
import type { InterviewCompleteRetentionPayload } from '@/lib/retention/interview-complete-retention';
import type { InterviewRetentionClientPayload } from '@/lib/retention/process-interview-complete';
import { processInterviewRetentionSafely } from '@/lib/retention/process-interview-complete';
import type { UserProgressRow } from '@/lib/retention/types';

type RetentionResponsePayload = InterviewCompleteRetentionPayload;

function attachRetentionToBody<T extends Record<string, unknown>>(
  body: T,
  retention: InterviewCompleteRetentionPayload | null,
): void {
  if (retention === null) return;
  Object.assign(body, { retention });
  if (retention.newBadges.length > 0) {
    Object.assign(body, { badgesUnlocked: retention.newBadges });
  }
}

async function enrichRetentionPayload(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  base: InterviewRetentionClientPayload | null,
): Promise<RetentionResponsePayload | null> {
  if (base === null) return null;

  const tierAfterUnlock = base.currentTier;
  let progress: string | null = null;
  let nextTierNumber: number | null = null;
  let nextTierProgressPercent = 0;

  const emptySlice: Pick<
    UserProgressRow,
    | 'total_sessions'
    | 'sessions_at_current_tier'
    | 'max_dimension_score'
    | 'last_5_sessions_avg'
    | 'overall_avg_score'
  > = {
    total_sessions: 0,
    sessions_at_current_tier: 0,
    max_dimension_score: null,
    last_5_sessions_avg: null,
    overall_avg_score: null,
  };

  try {
    const { data, error } = await serviceClient
      .from('user_progress')
      .select(
        'current_tier, total_sessions, sessions_at_current_tier, max_dimension_score, last_5_sessions_avg, overall_avg_score',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      const slice = data as Pick<
        UserProgressRow,
        | 'total_sessions'
        | 'sessions_at_current_tier'
        | 'max_dimension_score'
        | 'last_5_sessions_avg'
        | 'overall_avg_score'
      >;
      const tier = Number(data.current_tier) || tierAfterUnlock;
      progress = formatProgressMessage(tier, slice);
      const fill = computeNextTierProgressPercent(tier, slice);
      nextTierNumber = fill.nextTierNumber;
      nextTierProgressPercent = fill.percentTowardNext;
    } else {
      const fill = computeNextTierProgressPercent(tierAfterUnlock, emptySlice);
      nextTierNumber = fill.nextTierNumber;
      nextTierProgressPercent = fill.percentTowardNext;
    }
  } catch {
    progress = null;
    const fill = computeNextTierProgressPercent(tierAfterUnlock, emptySlice);
    nextTierNumber = fill.nextTierNumber;
    nextTierProgressPercent = fill.percentTowardNext;
  }

  return {
    ...base,
    streakCount: base.streak,
    badgeEarned: base.newBadges[0] ?? null,
    progress,
    nextTierNumber,
    nextTierProgressPercent,
  };
}

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

    const validation = interviewCompleteSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 },
      );
    }
    const { interviewId } = validation.data;

    const serviceClient = createServiceClient();

    const { data: interview } = await serviceClient
      .from('interviews')
      .select('id, user_id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    /** Idempotent: already completed → return stored report (+ best-effort retention backfill). */
    if (interview.status === 'completed') {
      const { data: existingReport } = await serviceClient
        .from('reports')
        .select('id')
        .eq('interview_id', interviewId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingReport) {
        let retentionPayload: RetentionResponsePayload | null = null;
        try {
          const raw = await processInterviewRetentionSafely(user.id, interviewId);
          retentionPayload = await enrichRetentionPayload(serviceClient, user.id, raw);
        } catch (retentionErr) {
          console.error('[interview/complete] retention (idempotent path):', retentionErr);
        }

        const body: {
          reportId: string;
          retention?: RetentionResponsePayload;
          badgesUnlocked?: string[];
        } = {
          reportId: existingReport.id as string,
        };
        attachRetentionToBody(body, retentionPayload);
        return NextResponse.json(body);
      }
    }

    await serviceClient
      .from('interviews')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', interviewId);

    const { reportId } = await aggregateReport(interviewId, user.id);

    let retentionPayload: RetentionResponsePayload | null = null;
    try {
      const raw = await processInterviewRetentionSafely(user.id, interviewId);
      retentionPayload = await enrichRetentionPayload(serviceClient, user.id, raw);
    } catch (retentionErr) {
      console.error('[interview/complete] retention:', retentionErr);
    }

    const body: {
      reportId: string;
      retention?: RetentionResponsePayload;
      badgesUnlocked?: string[];
    } = { reportId };
    attachRetentionToBody(body, retentionPayload);

    return NextResponse.json(body);
  } catch (err) {
    console.error('[interview/complete] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
