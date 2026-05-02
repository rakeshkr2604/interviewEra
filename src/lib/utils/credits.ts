import { createServiceClient } from '@/lib/supabase/server';

export interface CreditResult {
  success: boolean;
  remaining: number;
  reason?: 'no_credits';
}

/**
 * Atomically deducts 1 credit via PostgreSQL RPC.
 * The deduct_credit function uses UPDATE...WHERE credits_remaining > 0,
 * which prevents race conditions at the DB level.
 */
export async function checkAndDeductCredit(userId: string): Promise<CreditResult> {
  const supabase = createServiceClient();

  const { data, error } = await supabase.rpc('deduct_credit', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Credit deduction failed: ${error.message}`);
  }

  const result = (data as Array<{ success: boolean; remaining: number }>)[0];

  if (!result?.success) {
    return { success: false, remaining: 0, reason: 'no_credits' };
  }

  return { success: true, remaining: result.remaining };
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
 * Refunds 1 credit when an interview start operation fails after deduction.
 * Logs but does not throw — refund failure must not mask the original error.
 */
export async function refundCredit(userId: string): Promise<void> {
  const supabase = createServiceClient();

  const { error } = await supabase.rpc('refund_credit', {
    p_user_id: userId,
  });

  if (error) {
    console.error(`[credits] Refund failed for user ${userId}:`, error.message);
  }
}
