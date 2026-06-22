import { buildInterviewCompletedEmailPayload } from './build-interview-payload';
import { sendLifecycleTemplate } from './send-template';
import type { RadarDataPoint } from '@/types/app.types';

const LOG_PREFIX = '[interview-completed-email]';

export interface SendInterviewCompletedEmailInput {
  interviewId: string;
  userId: string;
  reportId: string;
  overallScore: number;
  radarData: RadarDataPoint[];
  recipientEmail: string;
}

export async function sendInterviewCompletedEmail(
  input: SendInterviewCompletedEmailInput,
): Promise<void> {
  const payload = await buildInterviewCompletedEmailPayload(
    input.interviewId,
    input.userId,
    input.reportId,
    input.overallScore,
    input.radarData,
  );

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
    idempotencyKey: `interview_completed:${input.interviewId}`,
    props: payload as unknown as Record<string, unknown>,
    text: `Your mock interview is complete. Score: ${payload.overallScore}/100. View report: ${payload.reportUrl}`,
  });

  if (!result.sent && !result.skipped) {
    console.error(`${LOG_PREFIX} delivery failed`, {
      interviewId: input.interviewId,
      error: result.error,
    });
  }
}
