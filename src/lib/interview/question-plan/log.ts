import type { PlanLogEvent } from './types';

/**
 * Structured question-plan telemetry. Never include resume or JD text.
 */
export function logQuestionPlan(
  interviewId: string,
  event: PlanLogEvent,
): void {
  console.info(
    '[question-plan]',
    JSON.stringify({
      interview_id: interviewId,
      event: event.event,
      question_number: event.questionNumber ?? null,
      question_type: event.questionType ?? null,
      category: event.category ?? null,
      source: event.source ?? null,
      plan_status: event.planStatus ?? null,
      similarity_score: event.similarityScore ?? null,
      rejection_reason: event.rejectionReason ?? null,
      latency_ms: event.latencyMs ?? null,
      timings: event.timings ?? null,
    }),
  );
}
