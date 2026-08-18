import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { technicalCreditRestorationLabel } from '@/lib/technical-failures/status';
import type {
  TechnicalFailureCategory,
  TechnicalFailureStatus,
} from '@/lib/technical-failures/types';

export const runtime = 'nodejs';

export type UserTechnicalFailureCase = {
  id: string;
  status: TechnicalFailureStatus;
  failureCategory: TechnicalFailureCategory;
  interviewRole: string | null;
  interviewDifficulty: string | null;
  interviewStatus: string | null;
  submittedAt: string;
  resolvedAt: string | null;
  creditRestoration: ReturnType<typeof technicalCreditRestorationLabel>;
  serviceRecoveryGranted: boolean;
};

/**
 * Authenticated user-facing technical-case status.
 * Identity comes from the session; service role is used only because the
 * case table is intentionally not directly client-readable.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: cases, error } = await service
    .from('technical_failure_cases')
    .select(
      'id, status, failure_category, submitted_at, resolved_at, original_debit_transaction_id, restoration_transaction_id, service_recovery_transaction_id, interview_id',
    )
    .eq('user_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(25);

  if (error) {
    console.error('[technical-failures] user case list failed:', error.message);
    return NextResponse.json({ error: 'Could not load technical issues.' }, { status: 502 });
  }

  const interviewIds = (cases ?? []).map((item) => item.interview_id as string);
  const { data: interviews } =
    interviewIds.length > 0
      ? await service
          .from('interviews')
          .select('id, role, difficulty, status')
          .eq('user_id', user.id)
          .in('id', interviewIds)
      : { data: [] };

  const interviewById = new Map((interviews ?? []).map((item) => [item.id as string, item]));

  const items: UserTechnicalFailureCase[] = (cases ?? []).map((item) => {
    const interview = interviewById.get(item.interview_id as string) ?? null;
    return {
      id: item.id as string,
      status: item.status as TechnicalFailureStatus,
      failureCategory: item.failure_category as TechnicalFailureCategory,
      interviewRole: (interview?.role as string | null) ?? null,
      interviewDifficulty: (interview?.difficulty as string | null) ?? null,
      interviewStatus: (interview?.status as string | null) ?? null,
      submittedAt: item.submitted_at as string,
      resolvedAt: (item.resolved_at as string | null) ?? null,
      creditRestoration: technicalCreditRestorationLabel({
        status: item.status as TechnicalFailureStatus,
        originalDebitPresent: Boolean(item.original_debit_transaction_id),
        restorationPresent: Boolean(item.restoration_transaction_id),
      }),
      serviceRecoveryGranted: Boolean(item.service_recovery_transaction_id),
    };
  });

  return NextResponse.json({ items });
}
