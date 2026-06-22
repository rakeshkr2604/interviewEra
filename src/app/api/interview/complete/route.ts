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
import { buildFunnelCompleteGa4Payload } from '@/lib/analytics/funnel-server';
import type { FunnelCompleteGa4Payload } from '@/lib/analytics/funnel-ga4-bridge';
import { processInterviewRetentionSafely } from '@/lib/retention/process-interview-complete';
import type { UserProgressRow } from '@/lib/retention/types';
import { isValidPersistedEvaluation } from '@/lib/evaluation/evaluation-validity';
import { sendInterviewCompletedEmail } from '@/lib/email/lifecycle/send-interview-completed';

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
    xpEarned: base.xpEarned,
    nextUnlockTeaser: base.nextUnlockTeaser,
    streakLabel: base.streakLabel,
    recoveryHint: base.recoveryHint,
  };
}

// Report aggregation + retention processing can take several seconds on slow
// providers. Pin the serverless budget so a slow `/complete` is not platform-
// killed mid-write (audit: "/complete no explicit maxDuration"). Matches the
// client's 60s POST AbortController budget.
export const maxDuration = 60;

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
      .select('id, user_id, status, started_at')
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

        const funnelComplete = await buildFunnelCompleteGa4Payload(
          serviceClient,
          user.id,
          interviewId,
        );

        const body: {
          reportId: string;
          retention?: RetentionResponsePayload;
          badgesUnlocked?: string[];
          funnelComplete?: FunnelCompleteGa4Payload;
        } = {
          reportId: existingReport.id as string,
          funnelComplete,
        };
        attachRetentionToBody(body, retentionPayload);
        return NextResponse.json(body);
      }
    }

    const completedAt = new Date().toISOString();
    await serviceClient
      .from('interviews')
      .update({
        status: 'completed',
        completed_at: completedAt,
        ...(interview.started_at ? {} : { started_at: completedAt }),
      })
      .eq('id', interviewId);

    // ── Evaluation integrity check: ensure all answers have valid evaluations ──
    // Fetch all questions and their answers for this interview
    const { data: questions } = await serviceClient
      .from('questions')
      .select('id')
      .eq('interview_id', interviewId);

    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.id as string);

      const { data: answers } = await serviceClient
        .from('answers')
        .select('id, question_id')
        .in('question_id', questionIds);

      if (answers && answers.length > 0) {
        const answerIds = answers.map(a => a.id as string);

        // Check which answers have valid evaluations (non-null scores)
        const { data: evaluations } = await serviceClient
          .from('evaluations')
          .select('answer_id, overall_score, dimension_scores')
          .in('answer_id', answerIds);

        const validEvalIds = new Set(
          (evaluations ?? [])
            .filter((e) =>
              typeof e.answer_id === 'string' &&
              isValidPersistedEvaluation({
                overall_score: e.overall_score,
                dimension_scores: e.dimension_scores,
              }),
            )
            .map(e => e.answer_id as string),
        );

        // Find answers missing valid evaluations
        const missingEvalAnswerIds = answerIds.filter(id => !validEvalIds.has(id));

        if (missingEvalAnswerIds.length > 0) {
          console.warn(
            `[interview/complete] ${missingEvalAnswerIds.length}/${answerIds.length} answers ` +
            `missing valid evaluations — backfilling with neutral scores`,
            { interviewId, missingCount: missingEvalAnswerIds.length },
          );

          // Backfill missing evaluations with neutral scores
          const fallbackDimensions = {
            communication_clarity: 5,
            technical_depth: 5,
            answer_structure: 5,
            confidence: 5,
            relevance: 5,
          };
          const fallbackAnalysis = {
            strengths: ['Answer submitted successfully.'],
            improvements: ['Evaluation was unavailable — try another session for detailed feedback.'],
            model_answer_hint: '',
            keywords_missing: [],
            score_justification: {
              why_this_score: 'Neutral score assigned due to evaluation unavailability at completion time.',
              key_strengths: ['Answer was recorded.'],
              improvement_areas: ['Practice with another session.'],
            },
          };

          for (const answerId of missingEvalAnswerIds) {
            // Check if there's an existing row (might have null scores)
            const { data: existingEval } = await serviceClient
              .from('evaluations')
              .select('id')
              .eq('answer_id', answerId)
              .maybeSingle();

            if (existingEval) {
              // Update existing row with valid scores
              await serviceClient
                .from('evaluations')
                .update({
                  overall_score: 5,
                  dimension_scores: fallbackDimensions,
                  feedback_text: 'Evaluation backfilled at report generation time.',
                  detailed_analysis: fallbackAnalysis,
                })
                .eq('id', existingEval.id);
            } else {
              // Insert new fallback evaluation
              await serviceClient
                .from('evaluations')
                .insert({
                  answer_id: answerId,
                  overall_score: 5,
                  dimension_scores: fallbackDimensions,
                  feedback_text: 'Evaluation unavailable — neutral score assigned.',
                  detailed_analysis: fallbackAnalysis,
                });
            }
          }

          console.info(
            `[interview/complete] Backfilled ${missingEvalAnswerIds.length} evaluations`,
            { interviewId },
          );
        }
      }
    }

    const { reportId, overallScore, radarData } = await aggregateReport(interviewId, user.id);

    if (user.email) {
      void sendInterviewCompletedEmail({
        interviewId,
        userId: user.id,
        reportId,
        overallScore,
        radarData,
        recipientEmail: user.email,
      }).catch((emailErr) => {
        console.error('[interview/complete] interview completed email failed:', emailErr);
      });
    }

    let retentionPayload: RetentionResponsePayload | null = null;
    try {
      const raw = await processInterviewRetentionSafely(user.id, interviewId);
      retentionPayload = await enrichRetentionPayload(serviceClient, user.id, raw);
    } catch (retentionErr) {
      console.error('[interview/complete] retention:', retentionErr);
    }

    const funnelComplete = await buildFunnelCompleteGa4Payload(
      serviceClient,
      user.id,
      interviewId,
    );

    const body: {
      reportId: string;
      retention?: RetentionResponsePayload;
      badgesUnlocked?: string[];
      funnelComplete?: FunnelCompleteGa4Payload;
    } = { reportId, funnelComplete };
    attachRetentionToBody(body, retentionPayload);

    return NextResponse.json(body);
  } catch (err) {
    console.error('[interview/complete] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
