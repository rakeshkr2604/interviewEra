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

/** Returns true when a successful send was already recorded for this key. */
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
