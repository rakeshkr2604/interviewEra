import { createServiceClient } from '@/lib/supabase/server';
import type { LifecycleTemplateName } from './constants';

export interface LifecycleEmailLogInput {
  userId: string | null;
  template: LifecycleTemplateName;
  idempotencyKey: string;
  status: 'sent' | 'failed';
  providerMessageId?: string;
  errorMessage?: string;
}

export type ClaimLifecycleEmailResult =
  | { status: 'claimed'; claimId: string }
  | { status: 'already_handled' }
  | { status: 'error'; message: string };

/** Marker written while Resend is in flight — claim occupies the unique sent index. */
export const CLAIM_IN_PROGRESS = 'claim_in_progress';

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === '23505' ||
    /duplicate key|unique constraint/i.test(error.message ?? '')
  );
}

/**
 * Returns true when a successful send or an in-flight claim already occupies this key.
 * In-flight claims (status=sent, claim_in_progress) count as handled so concurrent
 * callers skip Resend. Failed sends release the claim (status→failed) and return false.
 */
export async function wasLifecycleEmailSent(idempotencyKey: string): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('lifecycle_email_log')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .eq('status', 'sent')
    .maybeSingle();
  return Boolean(data);
}

const LIFECYCLE_KEY_CHUNK = 100;

/**
 * One (chunked) lookup for already-sent / in-flight claim keys.
 * Failed rows are excluded because they are not status=sent.
 */
export async function prefetchSentLifecycleKeys(
  keys: readonly string[],
  supabase: { from: ReturnType<typeof createServiceClient>['from'] } = createServiceClient(),
): Promise<Set<string>> {
  const sent = new Set<string>();
  const unique = [...new Set(keys.filter((key) => key.length > 0))];
  for (let i = 0; i < unique.length; i += LIFECYCLE_KEY_CHUNK) {
    const chunk = unique.slice(i, i + LIFECYCLE_KEY_CHUNK);
    const { data, error } = await supabase
      .from('lifecycle_email_log')
      .select('idempotency_key')
      .in('idempotency_key', chunk)
      .eq('status', 'sent');
    if (error) {
      throw new Error(error.message);
    }
    for (const row of data ?? []) {
      if (typeof row.idempotency_key === 'string') sent.add(row.idempotency_key);
    }
  }
  return sent;
}

/**
 * Reserve the idempotency slot BEFORE calling Resend.
 * Inserts status='sent' (occupies idx_lifecycle_email_sent_idempotency).
 * Exactly one concurrent caller wins; losers get already_handled.
 */
export async function claimLifecycleEmailSend(input: {
  userId: string | null;
  template: LifecycleTemplateName;
  idempotencyKey: string;
}): Promise<ClaimLifecycleEmailResult> {
  if (await wasLifecycleEmailSent(input.idempotencyKey)) {
    return { status: 'already_handled' };
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('lifecycle_email_log')
    .insert({
      user_id: input.userId,
      template: input.template,
      idempotency_key: input.idempotencyKey,
      provider: 'resend',
      status: 'sent',
      provider_message_id: null,
      error_message: CLAIM_IN_PROGRESS,
    })
    .select('id')
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      return { status: 'already_handled' };
    }
    console.error('[lifecycle-email] claim insert failed', {
      template: input.template,
      idempotencyKey: input.idempotencyKey,
      message: error.message,
    });
    return { status: 'error', message: error.message };
  }

  if (!data?.id) {
    return { status: 'error', message: 'claim insert returned no id' };
  }

  return { status: 'claimed', claimId: data.id as string };
}

/** Mark a claimed row as successfully delivered (keeps status=sent). */
export async function confirmLifecycleEmailClaim(input: {
  claimId: string;
  providerMessageId: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('lifecycle_email_log')
    .update({
      provider_message_id: input.providerMessageId,
      error_message: null,
    })
    .eq('id', input.claimId);

  if (error) {
    console.error('[lifecycle-email] failed to confirm claim', {
      claimId: input.claimId,
      message: error.message,
    });
  }
}

/**
 * Release a claim after Resend/render failure so a later attempt can re-claim.
 * Flips status to 'failed' — drops out of the partial unique index on sent.
 */
export async function releaseLifecycleEmailClaim(input: {
  claimId: string;
  errorMessage: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('lifecycle_email_log')
    .update({
      status: 'failed',
      error_message: input.errorMessage,
      provider_message_id: null,
    })
    .eq('id', input.claimId);

  if (error) {
    console.error('[lifecycle-email] failed to release claim', {
      claimId: input.claimId,
      message: error.message,
    });
  }
}

/** Legacy insert helper — prefer claim → confirm/release for idempotent sends. */
export async function logLifecycleEmail(input: LifecycleEmailLogInput): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('lifecycle_email_log').insert({
    user_id: input.userId,
    template: input.template,
    idempotency_key: input.idempotencyKey,
    provider: 'resend',
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    console.error('[lifecycle-email] failed to write log', {
      template: input.template,
      idempotencyKey: input.idempotencyKey,
      message: error.message,
    });
  }
}
