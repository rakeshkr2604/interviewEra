import { createServiceClient } from '@/lib/supabase/server';
import { getProvider } from './providerSelector';
import { templateRegistry } from '../templates';
import { injectOpenTracker, rewriteLinks } from '../tracking';

export function getRetryDelaySeconds(retryCount: number): number {
  const intervals = [60, 300, 1800, 21600, 86400]; // 1m, 5m, 30m, 6h, 24h
  return intervals[Math.min(retryCount, intervals.length - 1)] || 60;
}

export class EmailQueueWorker {
  private getSupabase() {
    return createServiceClient();
  }

  async processBatch(batchSize: number = 10): Promise<void> {
    const supabase = this.getSupabase();
    const now = new Date().toISOString();

    // 1. Fetch pending or failed jobs due for retry (using select for update or simple fetch)
    const { data: jobs, error: fetchError } = await supabase
      .from('email_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', now)
      .limit(batchSize);

    if (fetchError || !jobs || jobs.length === 0) {
      return;
    }

    const provider = getProvider();
    const secret = process.env.EMAIL_SIGNING_SECRET || 'ie_email_secret_key';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.interviewera.com';

    for (const job of jobs) {
      // Mark job as processing to avoid double sends
      const { error: lockError } = await supabase
        .from('email_jobs')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', job.id);

      if (lockError) continue;

      const startTime = Date.now();
      let sendSuccess = false;
      let errorMsg = '';

      try {
        // Render template content
        const { html: rawHtml, subject } = await templateRegistry.render(
          job.template_name,
          job.payload
        );

        // Inject tracking elements
        let finalHtml = injectOpenTracker(rawHtml, job.id, baseUrl);
        finalHtml = rewriteLinks(finalHtml, job.id, secret, baseUrl);

        // Send email via active provider
        const result = await provider.send({
          to: job.recipient_email,
          subject,
          html: finalHtml,
        });

        sendSuccess = result.success;
        errorMsg = result.errorMessage || '';
      } catch (err) {
        sendSuccess = false;
        errorMsg = err instanceof Error ? err.message : 'Rendering error';
      }

      const latencyMs = Date.now() - startTime;
      const updatedStatus = sendSuccess
        ? 'sent'
        : job.retry_count >= 4
        ? 'dlq' // retry_count is 0-indexed; 5th failure goes to DLQ
        : 'failed';

      // Update queue job status
      const retryCount = sendSuccess ? job.retry_count : job.retry_count + 1;
      const nextAttemptSeconds = getRetryDelaySeconds(retryCount);
      const nextAttemptAt = new Date(
        Date.now() + nextAttemptSeconds * 1000
      ).toISOString();

      await supabase
        .from('email_jobs')
        .update({
          status: updatedStatus,
          retry_count: retryCount,
          next_attempt_at: sendSuccess ? job.next_attempt_at : nextAttemptAt,
          error_message: sendSuccess ? null : errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Audit logs
      await supabase
        .from('email_logs')
        .insert({
          job_id: job.id,
          status: updatedStatus,
          provider: process.env.EMAIL_PROVIDER || 'resend',
          error_message: sendSuccess ? null : errorMsg,
          latency_ms: latencyMs,
        });

      // Update analytics aggregation cache
      if (sendSuccess) {
        await supabase.rpc('increment_email_metric', {
          t_name: job.template_name,
          metric_column: 'sent_count',
        });
      } else if (updatedStatus === 'dlq') {
        await supabase.rpc('increment_email_metric', {
          t_name: job.template_name,
          metric_column: 'bounced_count',
        });
      }
    }
  }
}
export const emailQueueWorker = new EmailQueueWorker();
