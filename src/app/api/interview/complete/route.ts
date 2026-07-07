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
import { trackInterviewEvent } from '@/lib/analytics/interview-events';
import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';
import type { InterviewSessionContext } from '@/types/app.types';

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

type CompletionResponseBody = {
  reportId: string;
  retention?: RetentionResponsePayload;
  badgesUnlocked?: string[];
  funnelComplete?: FunnelCompleteGa4Payload;
};

/**
 * Build the success response for a completed interview: best-effort retention
 * enrichment + funnel payload wrapped around a known reportId. Shared by the
 * repair/idempotent path and the fresh-generation path so both return an
 * identical shape.
 */
async function buildReportResponseBody(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  interviewId: string,
  reportId: string,
): Promise<CompletionResponseBody> {
  let retentionPayload: RetentionResponsePayload | null = null;
  try {
    const raw = await processInterviewRetentionSafely(userId, interviewId);
    retentionPayload = await enrichRetentionPayload(serviceClient, userId, raw);
  } catch (retentionErr) {
    console.error('[interview/complete] retention enrichment failed', {
      interviewId,
      error: retentionErr instanceof Error ? retentionErr.message : 'unknown',
    });
  }

  const funnelComplete = await buildFunnelCompleteGa4Payload(
    serviceClient,
    userId,
    interviewId,
  );

  const body: CompletionResponseBody = { reportId, funnelComplete };
  attachRetentionToBody(body, retentionPayload);
  return body;
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
      .select('id, user_id, status, started_at, session_context')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const completedAt = new Date().toISOString();
    const sessionCtx = { ...((interview.session_context ?? {}) as InterviewSessionContext) };
    delete sessionCtx.resume;

    /**
     * Repair-aware idempotency. A persisted report is the source of truth for
     * "this interview produced a scored result". Report generation now happens
     * BEFORE the status flips to 'completed' (Invariant #4: a completed interview
     * can never lack a score), so a crash between those two writes can leave a
     * report present while status is still 'in_progress'. Detect the report
     * first; if it exists, (re)assert 'completed' and return the stored report —
     * never regenerate or duplicate it.
     */
    const { data: existingReport } = await serviceClient
      .from('reports')
      .select('id')
      .eq('interview_id', interviewId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingReport) {
      if (interview.status !== 'completed') {
        const { error: repairErr } = await serviceClient
          .from('interviews')
          .update({
            status: 'completed',
            completed_at: completedAt,
            session_context: sessionCtx,
            ...(interview.started_at ? {} : { started_at: completedAt }),
          })
          .eq('id', interviewId);
        if (repairErr) {
          console.error('[interview/complete] status repair failed (report already exists)', {
            interviewId,
            error: repairErr.message,
          });
        }
      }
      return NextResponse.json(
        await buildReportResponseBody(
          serviceClient,
          user.id,
          interviewId,
          existingReport.id as string,
        ),
      );
    }

    // Report generation requires at least one answer. Resolve answer presence up
    // front — it drives both the 0-answer guard and the integrity backfill.
    const { data: questions } = await serviceClient
      .from('questions')
      .select('id')
      .eq('interview_id', interviewId);

    const questionIds = (questions ?? []).map((q) => q.id as string);

    const { data: answers } =
      questionIds.length > 0
        ? await serviceClient
            .from('answers')
            .select('id, question_id')
            .in('question_id', questionIds)
        : { data: [] as { id: string; question_id: string }[] };

    // ── 0-answer guard ──
    // A session that reaches /complete with no persisted answers cannot produce a
    // scored report. Marking it 'completed' would create a zombie (completed, no
    // report, no score) that violates Invariant #4 and inflates completion
    // metrics. Transition to 'abandoned' instead and tell the client explicitly.
    // This is a NON-completion outcome, so no score is expected — Invariant #4
    // (which governs completed interviews) is upheld, not bypassed.
    if (!answers || answers.length === 0) {
      if (interview.status !== 'completed' && interview.status !== 'abandoned') {
        const { error: abandonErr } = await serviceClient
          .from('interviews')
          .update({ status: 'abandoned', completed_at: completedAt })
          .eq('id', interviewId);
        if (abandonErr) {
          console.error('[interview/complete] abandon (no answers) update failed', {
            interviewId,
            error: abandonErr.message,
          });
        }
      }
      trackInterviewEvent('interview_abandoned', {
        userId: user.id,
        interviewId,
        reason: 'no_answers_recorded',
        source: 'complete_zero_answers',
      });
      // Durable — was console-only via trackInterviewEvent above. Fires on
      // every zero-answer /complete call including retries against an
      // already-abandoned interview (the DB status guard above only gates the
      // status UPDATE, not this branch); dedupe: partial unique index on
      // (event_name, interview_id) — migration 052.
      persistMilestoneEventOnce('interview_abandoned', {
        user_id: user.id,
        interview_id: interviewId,
        reason: 'no_answers_recorded',
      });
      return NextResponse.json({
        abandoned: true,
        reason: 'no_answers_recorded',
        message: 'No answers were recorded for this session.',
      });
    }

    // ── FM-5: answers saved during a Redis outage (evaluation_status =
    // 'pending_backfill') have NO evaluation on purpose. They must not be
    // neutral-score backfilled below, and they contribute nothing to the
    // report score — the report UI labels them "Answer recorded — evaluation
    // pending" and scripts/backfill-pending-evaluations.ts re-evaluates them.
    // Queried separately (not folded into the main select) so environments
    // without migration 053 fall back to the legacy behavior instead of
    // failing the whole completion.
    const allAnswerIds = answers.map((a) => a.id as string);
    let pendingBackfillIds = new Set<string>();
    try {
      const { data: pendingRows, error: pendingErr } = await serviceClient
        .from('answers')
        .select('id')
        .in('id', allAnswerIds)
        .eq('evaluation_status', 'pending_backfill');
      if (!pendingErr && pendingRows) {
        pendingBackfillIds = new Set(pendingRows.map((r) => r.id as string));
      }
    } catch {
      /* evaluation_status column absent (migration 053 pending) — legacy path */
    }

    if (pendingBackfillIds.size > 0 && pendingBackfillIds.size >= allAnswerIds.length) {
      // Every answer is awaiting backfill — an honest scored report is not
      // possible right now. Keep the interview non-completed (no zombie,
      // Invariant #4 governs completed interviews) and say so explicitly;
      // retrying after the backfill script has run will complete normally.
      console.warn('[interview/complete] all answers pending_backfill — deferring completion', {
        interviewId,
        pendingCount: pendingBackfillIds.size,
      });
      return NextResponse.json(
        {
          error:
            'Your answers are recorded, but evaluation is temporarily delayed. ' +
            'Please try again in a few minutes — nothing was lost.',
          code: 'evaluations_pending_backfill',
        },
        { status: 503 },
      );
    }

    // ── Evaluation integrity check: ensure all answers have valid evaluations ──
    {
      const answerIds = answers.map((a) => a.id as string);

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

      // Find answers missing valid evaluations. pending_backfill answers are
      // deliberately excluded — fabricating a neutral 5 for them would present
      // degraded data as a real score (FM-5 honesty requirement).
      const missingEvalAnswerIds = answerIds.filter(
        id => !validEvalIds.has(id) && !pendingBackfillIds.has(id),
      );

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

    // Report FIRST — throws if it cannot produce a scored report, in which case
    // status stays non-completed (no zombie) and the outer catch returns 500.
    const { reportId, overallScore, radarData } = await aggregateReport(interviewId, user.id);

    // Report is persisted → NOW flip status to 'completed' (checked — F5). Writing
    // status only after a scored report exists guarantees no completed interview
    // can lack a score (Invariant #4). If this write fails the report still
    // exists, so a retry repairs status via the report-exists branch above.
    const { error: statusErr } = await serviceClient
      .from('interviews')
      .update({
        status: 'completed',
        completed_at: completedAt,
        session_context: sessionCtx,
        ...(interview.started_at ? {} : { started_at: completedAt }),
      })
      .eq('id', interviewId);

    if (statusErr) {
      console.error('[interview/complete] status update failed after report insert', {
        interviewId,
        reportId,
        error: statusErr.message,
      });
    }

    trackInterviewEvent('report_generated', {
      userId: user.id,
      interviewId,
      reportId,
      overallScore,
    });

    // Durable lifecycle event — fresh completion only, after the report exists
    // and status is 'completed' (never inside the retention function, which
    // runs after this and can fail independently — see processInterviewRetentionSafely).
    // A retry that lands on the `existingReport` branch above never reaches
    // here, so a repeated POST cannot re-fire this. Dedupe: partial unique
    // index on (event_name, interview_id) — migration 052 — as defense in
    // depth against a genuine concurrent double-submit race.
    persistMilestoneEventOnce('interview_completed', {
      user_id: user.id,
      interview_id: interviewId,
      report_id: reportId,
      overall_score: overallScore,
    });

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

    return NextResponse.json(
      await buildReportResponseBody(serviceClient, user.id, interviewId, reportId),
    );
  } catch (err) {
    console.error('[interview/complete] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
