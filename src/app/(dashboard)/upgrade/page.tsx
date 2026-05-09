import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata({
  title: 'Upgrade',
  description: 'Upgrade your InterviewEra plan and interview credits.',
  path: '/upgrade',
});
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { PricingSection } from './PricingSection';
import { CreditExhaustedSection } from './CreditExhaustedSection';
import type { PlanTier, RadarDataPoint } from '@/types/app.types';

export default async function UpgradePage() {
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
    .select('plan_tier, email, credits_remaining')
    .eq('id', user.id)
    .single();

  const currentPlan = (profile?.plan_tier ?? 'free') as PlanTier;
  const creditsRemaining = profile?.credits_remaining ?? 0;
  const email = profile?.email ?? user.email ?? '';

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

      const { data: reports } = await supabase
        .from('reports')
        .select('overall_score, generated_at')
        .in('interview_id', interviewIds)
        .order('generated_at', { ascending: true })
        .limit(5);

      if (reports) {
        trendData = reports.map((r, i) => ({
          dimension: `Interview ${i + 1}`,
          score: Math.round((r.overall_score as number) * 10) / 10,
        }));
      }
    }
  }

  const isExhausted = creditsRemaining === 0;

  return (
    <div className="space-y-8">
      <DashboardPageHeader
        eyebrow="Pricing"
        title={isExhausted ? 'Keep your momentum going' : 'Upgrade your plan'}
        subtitle={
          isExhausted
            ? "You've used your credits. Same plans as our homepage — pick monthly or annual and unlock more practice."
            : 'More credits, deeper feedback, better results. Credits deduct when an interview starts.'
        }
      />

      {isExhausted && (
        <CreditExhaustedSection
          trendData={trendData}
          totalInterviewsCompleted={totalInterviewsCompleted}
        />
      )}

      <PricingSection currentPlan={currentPlan} userEmail={email} />

      <div
        className="mx-auto max-w-xl rounded-[14px] border-2 px-4 py-3 text-center"
        style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)' }}
      >
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Payments processed securely by Razorpay. Cancel anytime.
        </p>
      </div>
    </div>
  );
}
