import { createServiceClient } from '@/lib/supabase/server';
import {
  ActiveInterviewExistsError,
  activeInterviewConflictFromRpc,
  isActiveInterviewConflictError,
} from '@/lib/interview/active-interview-policy';
import type {
  InterviewDifficulty,
  InterviewStatus,
} from '@/types/app.types';

export { ActiveInterviewExistsError } from '@/lib/interview/active-interview-policy';

export interface CreditResult {
  success: boolean;
  remaining: number;
  reason?: 'no_credits';
}

export interface CreateInterviewWithCreditInput {
  userId: string;
  resumeId: string;
  role: string;
  difficulty: InterviewDifficulty;
  questionCount: number;
  status: Extract<InterviewStatus, 'pending' | 'in_progress'>;
  startedAt: string | null;
  interviewerId: string;
  sessionContext: object;
  engine?: 'v1' | 'v2.1';
  scriptType?: string | null;
  selfIntroEnabled?: boolean;
  followUpEnabled?: boolean;
  isReturningUser?: boolean;
  maxSkips?: number;
  skipsUsed?: number;
  currentTurnIndex?: number;
}

export interface InterviewCreditResult extends CreditResult {
  interviewId?: string;
  creditTransactionId?: string;
  created?: boolean;
}

/**
 * Canonical interview start path: creates the interview, deducts one credit,
 * marks ownership, and writes the linked debit in one PostgreSQL transaction.
 */
export async function createInterviewWithCredit(
  input: CreateInterviewWithCreditInput,
): Promise<InterviewCreditResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('create_interview_with_credit', {
    p_user_id: input.userId,
    p_resume_id: input.resumeId,
    p_role: input.role,
    p_difficulty: input.difficulty,
    p_question_count: input.questionCount,
    p_status: input.status,
    p_started_at: input.startedAt,
    p_interviewer_id: input.interviewerId,
    p_session_context: input.sessionContext,
    p_engine: input.engine ?? 'v2.1',
    p_script_type: input.scriptType ?? null,
    p_self_intro_enabled: input.selfIntroEnabled ?? true,
    p_follow_up_enabled: input.followUpEnabled ?? true,
    p_is_returning_user: input.isReturningUser ?? false,
    p_max_skips: input.maxSkips ?? 2,
    p_skips_used: input.skipsUsed ?? 0,
    p_current_turn_index: input.currentTurnIndex ?? 0,
  });

  if (error) {
    if (isActiveInterviewConflictError(error)) {
      const conflict = activeInterviewConflictFromRpc(error);
      if (conflict.interviewId !== 'unknown') {
        throw conflict;
      }

      try {
        const { data: existing } = await supabase
          .from('interviews')
          .select('id, status, engine, started_at')
          .eq('user_id', input.userId)
          .in('status', ['pending', 'in_progress'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          throw new ActiveInterviewExistsError(
            existing.id,
            existing.status ?? undefined,
            existing.engine ?? undefined,
            existing.started_at ?? null,
          );
        }
      } catch (lookupErr) {
        if (lookupErr instanceof ActiveInterviewExistsError) throw lookupErr;
      }

      throw conflict;
    }
    throw new Error(`Interview creation and credit deduction failed: ${error.message}`);
  }

  const result = (
    data as Array<{
      success: boolean;
      remaining: number;
      interview_id: string | null;
      credit_transaction_id: string | null;
      created: boolean;
    }>
  )[0];

  if (!result?.success) {
    return { success: false, remaining: 0, reason: 'no_credits' };
  }

  if (!result.interview_id || !result.credit_transaction_id) {
    throw new Error('Interview credit transaction returned incomplete ownership data');
  }

  return {
    success: true,
    remaining: result.remaining,
    interviewId: result.interview_id,
    creditTransactionId: result.credit_transaction_id,
    created: result.created,
  };
}

export async function addCredit(
  userId: string,
  amount: number,
  reason: string
): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc('add_credit', {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
  });

  if (error) {
    throw new Error(`Credit addition failed: ${error.message}`);
  }
}

/**
 * Refunds 1 credit linked to an interview when start setup fails after debit.
 * Logs but does not throw — refund failure must not mask the original error.
 */
export async function refundCredit(userId: string, interviewId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc('refund_credit', {
    p_user_id: userId,
    p_interview_id: interviewId,
  });

  if (error) {
    console.error(
      `[credits] Refund failed for user ${userId}, interview ${interviewId}:`,
      error.message,
    );
  }
}
