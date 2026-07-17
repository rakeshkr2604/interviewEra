import { buildScriptInterviewCompletedEmailPayload } from './build-script-interview-payload';
import { sendLifecycleTemplate } from './send-template';
import type { DimensionKey } from '@/lib/interview/answer-score/rubric';

const LOG_PREFIX = '[script-interview-completed-email]';

export interface SendScriptInterviewCompletedEmailInput {
  interviewId: string;
  userId: string;
  recipientEmail: string;
  overallScore10: number;
  dimensionAverages: Record<DimensionKey, number>;
  scoredAnswerCount: number;
  synthesis: unknown;
}

/**
 * Fire-and-forget safe: callers should void + .catch.
 * Idempotent via lifecycle_email_log key script_interview_completed:{interviewId}.
 */
export async function sendScriptInterviewCompletedEmail(
  input: SendScriptInterviewCompletedEmailInput,
): Promise<void> {
  if (input.scoredAnswerCount <= 0 || input.overallScore10 == null) {
    console.info(`${LOG_PREFIX} skip — no scored answers`, {
      interviewId: input.interviewId,
    });
    return;
  }

  const payload = await buildScriptInterviewCompletedEmailPayload({
    interviewId: input.interviewId,
    userId: input.userId,
    overallScore10: input.overallScore10,
    dimensionAverages: input.dimensionAverages,
    scoredAnswerCount: input.scoredAnswerCount,
    synthesis: input.synthesis,
  });

  if (!payload) {
    console.error(`${LOG_PREFIX} payload build failed`, {
      interviewId: input.interviewId,
      userId: input.userId,
    });
    return;
  }

  const result = await sendLifecycleTemplate({
    template: 'interview_completed',
    to: input.recipientEmail,
    userId: input.userId,
    idempotencyKey: `script_interview_completed:${input.interviewId}`,
    props: payload as unknown as Record<string, unknown>,
    text: `Your mock interview is complete. Score: ${payload.overallScore}/100. View report: ${payload.reportUrl}`,
  });

  if (!result.sent && !result.skipped) {
    console.error(`${LOG_PREFIX} delivery failed`, {
      interviewId: input.interviewId,
      error: result.error,
    });
  } else if (result.sent) {
    console.info(`${LOG_PREFIX} sent`, { interviewId: input.interviewId });
  }
}
