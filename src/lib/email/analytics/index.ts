import { createServiceClient } from '@/lib/supabase/server';
import { EmailJob, EmailMetric, EmailJobStatus } from '../types';

export interface EmailDashboardStats {
  totalSent: number;
  deliveryRate: number;
  openRate: number;
  clickThroughRate: number;
  bounceRate: number;
  recentJobs: EmailJob[];
  failureReasons: { error: string; count: number }[];
  templatePerformance: EmailMetric[];
}

export class EmailAnalytics {
  private getSupabase() {
    return createServiceClient();
  }

  async getDashboardStats(): Promise<EmailDashboardStats> {
    const supabase = this.getSupabase();

    const { data: metrics } = await supabase
      .from('email_metrics')
      .select('*');

    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let totalBounced = 0;

    if (metrics) {
      metrics.forEach((m) => {
        totalSent += m.sent_count;
        totalOpened += m.opened_count;
        totalClicked += m.clicked_count;
        totalBounced += m.bounced_count;
      });
    }

    const deliveryRate = totalSent > 0 ? ((totalSent - totalBounced) / totalSent) * 100 : 0;
    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickThroughRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;

    const { data: recentJobs } = await supabase
      .from('email_jobs')
      .select('id, recipient_email, template_name, status, retry_count, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: failures } = await supabase
      .from('email_jobs')
      .select('error_message')
      .not('error_message', 'is', null)
      .eq('status', 'dlq');

    const counts: Record<string, number> = {};
    if (failures) {
      failures.forEach((f) => {
        const msg = f.error_message || 'Unknown error';
        counts[msg] = (counts[msg] || 0) + 1;
      });
    }

    const failureReasons = Object.entries(counts).map(([error, count]) => ({
      error,
      count,
    })).sort((a, b) => b.count - a.count).slice(0, 5);

    return {
      totalSent,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
      openRate: Math.round(openRate * 10) / 10,
      clickThroughRate: Math.round(clickThroughRate * 10) / 10,
      bounceRate: Math.round(bounceRate * 10) / 10,
      recentJobs: (recentJobs || []).map((j: {
        id: string;
        recipient_email: string;
        template_name: string;
        status: string;
        retry_count: number;
        error_message: string | null;
        created_at: string;
      }) => ({
        id: j.id,
        recipientEmail: j.recipient_email,
        templateName: j.template_name,
        status: j.status as EmailJobStatus,
        retryCount: j.retry_count,
        errorMessage: j.error_message || undefined,
        createdAt: j.created_at,
        nextAttemptAt: '',
        correlationId: '',
        payload: {},
      })),
      failureReasons,
      templatePerformance: metrics || [],
    };
  }

  async recordOpen(jobId: string, userAgent?: string, ipAddress?: string): Promise<void> {
    const supabase = this.getSupabase();

    await supabase.from('email_opens').insert({
      job_id: jobId,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    const { data: job } = await supabase
      .from('email_jobs')
      .select('template_name')
      .eq('id', jobId)
      .single();

    if (job) {
      await supabase.rpc('increment_email_metric', {
        t_name: job.template_name,
        metric_column: 'opened_count',
      });
    }
  }

  async recordClick(jobId: string, targetUrl: string, userAgent?: string, ipAddress?: string): Promise<void> {
    const supabase = this.getSupabase();

    await supabase.from('email_clicks').insert({
      job_id: jobId,
      target_url: targetUrl,
      user_agent: userAgent,
      ip_address: ipAddress,
    });

    const { data: job } = await supabase
      .from('email_jobs')
      .select('template_name')
      .eq('id', jobId)
      .single();

    if (job) {
      await supabase.rpc('increment_email_metric', {
        t_name: job.template_name,
        metric_column: 'clicked_count',
      });
    }
  }
}
export const emailAnalytics = new EmailAnalytics();
