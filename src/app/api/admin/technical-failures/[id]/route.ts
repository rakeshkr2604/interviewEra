import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const idSchema = z.string().uuid();
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('investigate') }),
  z.object({
    action: z.enum(['approve', 'reject']),
    reason: z.string().trim().min(3).max(2000),
  }),
  z.object({
    action: z.literal('service_recovery'),
    reason: z.string().trim().min(3).max(2000),
  }),
]);

function safeRpcError(message: string | undefined): { message: string; status: number } {
  if (message?.includes('No restorable interview credit')) {
    return { message: 'No restorable interview credit was found for this interview.', status: 409 };
  }
  if (message?.includes('Service-recovery credit is not eligible')) {
    return { message: 'This case is not eligible for a service-recovery credit.', status: 409 };
  }
  if (message?.includes('not found')) {
    return { message: 'Technical failure case not found.', status: 404 };
  }
  return { message: 'Could not update the technical failure case.', status: 500 };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { admin, error } = await requirePlatformAdmin();
  if (error) return error;

  const parsedId = idSchema.safeParse((await params).id);
  if (!parsedId.success) {
    return NextResponse.json({ error: 'Invalid case ID.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid action.' },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  const action = parsed.data;

  if (action.action === 'service_recovery') {
    const { data, error: rpcError } = await service.rpc('grant_service_recovery_credit', {
      p_case_id: parsedId.data,
      p_reviewer_id: admin.id,
      p_reviewer_email: admin.email,
      p_reason: action.reason,
    });

    if (rpcError) {
      console.error('[admin/technical-failures] service recovery failed:', rpcError.message);
      const safe = safeRpcError(rpcError.message);
      return NextResponse.json({ error: safe.message }, { status: safe.status });
    }

    return NextResponse.json({ ok: true, result: data });
  }

  const { data, error: rpcError } = await service.rpc('review_technical_failure_case', {
    p_case_id: parsedId.data,
    p_reviewer_id: admin.id,
    p_reviewer_email: admin.email,
    p_action: action.action,
    p_reason: action.action === 'investigate' ? '' : action.reason,
  });

  if (rpcError) {
    console.error('[admin/technical-failures] review failed:', rpcError.message);
    const safe = safeRpcError(rpcError.message);
    return NextResponse.json({ error: safe.message }, { status: safe.status });
  }

  return NextResponse.json({ ok: true, result: data });
}
