import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Upgrade',
  description: 'Upgrade your InterviewEra plan and interview credits.',
  path: '/upgrade',
});
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { PricingSection } from './PricingSection';
import { CreditExhaustedSection } from './CreditExhaustedSection';
import { UpgradePageFooter } from '@/components/pricing/UpgradePageFooter';
import { CommunityCTA } from '@/components/community/CommunityCTA';
import type { PlanTier, RadarDataPoint } from '@/types/app.types';
import { isPaidPlanId } from '@/lib/pricing/plans';
import { formatPlanExpiryEnIn } from '@/lib/pricing/copy';
import { normalizePricingCampaignCode } from '@/lib/pricing/plan-intent';
import {
  getPublicPricingSnapshot,
  publicSnapshotToPromoQuotes,
} from '@/lib/pricing/effective-price';
import type { PromoPlanQuote } from '@/components/pricing/PricingTierGrid';
import { mergeAnalyticsReports } from '@/lib/candidate/analytics-reports';

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; code?: string }>;
}) {
  const params = await searchParams;
  const selectedPlan = params.plan && isPaidPlanId(params.plan) ? params.plan : undefined;
  const initialCode = normalizePricingCampaignCode(params.code);
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('plan_tier, email, credits_remaining, plan_expires_at, plan_status')
    .eq('id', user.id)
    .single();

  const currentPlan = (profile?.plan_tier ?? 'free') as PlanTier;
  const creditsRemaining = profile?.credits_remaining ?? 0;
  const email = profile?.email ?? user.email ?? '';
  const planExpiresAt = (profile?.plan_expires_at as string | null) ?? null;
  const planStatus = (profile?.plan_status as string | null) ?? null;

  let trendData: RadarDataPoint[] = [];
  let totalInterviewsCompleted = 0;

  if (creditsRemaining === 0) {
    const { data: completedInterviews } = await supabase
      .from('interviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    totalInterviewsCompleted = completedInterviews?.length ?? 0;

    if (completedInterviews && completedInterviews.length > 0) {
      const interviewIds = completedInterviews.map((i) => i.id as string);

      const [{ data: v1Reports }, { data: scriptReports }] = await Promise.all([
        supabase
          .from('reports')
          .select('overall_score, radar_data, generated_at, interview_id')
          .in('interview_id', interviewIds)
          .order('generated_at', { ascending: false })
          .limit(20),
        supabase
          .from('script_interview_reports')
          .select('overall, dimension_averages, generated_at, interview_id, status')
          .in('interview_id', interviewIds)
          .in('status', ['ready', 'partial'])
          .order('generated_at', { ascending: false })
          .limit(20),
      ]);

      const merged = mergeAnalyticsReports(
        (v1Reports ?? []) as Parameters<typeof mergeAnalyticsReports>[0],
        (scriptReports ?? []) as Parameters<typeof mergeAnalyticsReports>[1],
        5,
      );
      trendData = merged.map((r, i) => ({
        dimension: `Interview ${i + 1}`,
        score: Math.round(r.overallScore * 10) / 10,
      }));
    }
  }

  const isExhausted = creditsRemaining === 0;

  let initialCampaignQuotes: Partial<Record<'starter' | 'pro', PromoPlanQuote>> | undefined;
  try {
    const snapshot = await getPublicPricingSnapshot(createServiceClient());
    initialCampaignQuotes = publicSnapshotToPromoQuotes(snapshot);
  } catch (error) {
    console.warn('[upgrade] global campaign snapshot unavailable', error);
  }

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Pricing"
        title={isExhausted ? 'Keep your momentum going' : 'Upgrade your preparation'}
        subtitle={
          isExhausted
            ? "You've used your credits. Same one-time plans as our homepage — pay once for 30 days and unlock more practice."
            : 'More credits, deeper feedback, better results. Credits deduct when an interview starts.'
        }
      />

      <section
        className="dashboard-premium-card grid gap-4 p-5 sm:grid-cols-3 sm:p-6"
        aria-label="Current plan status"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Current plan
          </p>
          <p className="mt-1 text-xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
            {currentPlan.replace('_', ' ')}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Credits
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {creditsRemaining} remaining
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Access
          </p>
          <p className="mt-1 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {planExpiresAt ? `Expires ${formatPlanExpiryEnIn(planExpiresAt)}` : 'No expiry'}
          </p>
        </div>
      </section>

      {isExhausted && (
        <CreditExhaustedSection
          trendData={trendData}
          totalInterviewsCompleted={totalInterviewsCompleted}
        />
      )}

      <PricingSection
        currentPlan={currentPlan}
        userEmail={email}
        planExpiresAt={planExpiresAt}
        planStatus={planStatus}
        selectedPlan={selectedPlan}
        initialCode={initialCode}
        initialCampaignQuotes={initialCampaignQuotes}
      />

      <CommunityCTA
        placement="credits_page"
        variant="compact"
        title="Free job alerts while you decide"
        subtitle="Join our WhatsApp channel for placement updates — no purchase required."
      />

      <UpgradePageFooter />
    </div>
  );
}
