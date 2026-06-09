/**
 * Server helpers for funnel analytics (GA4 payload assembly).
 */

import type { FunnelCompleteGa4Payload } from '@/lib/analytics/funnel-ga4-bridge';
import type { createServiceClient } from '@/lib/supabase/server';

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Build GA4 bridge payload for mock_interview_completed (idempotent-safe). */
export async function buildFunnelCompleteGa4Payload(
  serviceClient: ServiceClient,
  userId: string,
  interviewId: string,
): Promise<FunnelCompleteGa4Payload> {
  const [interviewRes, userRes, sessionRes] = await Promise.all([
    serviceClient
      .from('interviews')
      .select('role')
      .eq('id', interviewId)
      .maybeSingle(),
    serviceClient.from('users').select('plan_tier').eq('id', userId).maybeSingle(),
    serviceClient
      .from('session_quality_log')
      .select('session_score, quality_met')
      .eq('interview_id', interviewId)
      .maybeSingle(),
  ]);

  const interview = interviewRes.data;
  const user = userRes.data;
  const session = sessionRes.data;

  const scoreRaw = session?.session_score;
  const score =
    typeof scoreRaw === 'number' && Number.isFinite(scoreRaw) ? scoreRaw : undefined;

  return {
    interviewId,
    role: typeof interview?.role === 'string' ? interview.role : undefined,
    plan: typeof user?.plan_tier === 'string' ? user.plan_tier : undefined,
    score,
    qualityMet:
      typeof session?.quality_met === 'boolean' ? session.quality_met : undefined,
  };
}
