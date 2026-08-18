import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/admin/auth';
import {
  campusReviewDecisionSchema,
  campusReviewErrorStatus,
} from '@/lib/admin/campus-approvals';
import { createServiceClient } from '@/lib/supabase/server';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const parsedParams = paramsSchema.safeParse(await context.params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: 'Invalid organization ID.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const parsedBody = campusReviewDecisionSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? 'Invalid review decision.' },
      { status: 400 },
    );
  }

  const decision = parsedBody.data;
  const service = createServiceClient();
  const { data, error } = await service.rpc('review_campus_organization', {
    p_organization_id: parsedParams.data.id,
    p_actor_user_id: auth.admin.id,
    p_action: decision.action,
    p_reason: decision.action === 'rejected' ? decision.reason : null,
  });

  if (error) {
    const status = campusReviewErrorStatus(error.message, error.code);
    if (status >= 500) {
      console.error('[platform:campus-review:decision]', {
        organizationId: parsedParams.data.id,
        actorUserId: auth.admin.id,
        action: decision.action,
        code: error.code,
        message: error.message,
      });
    }
    const message =
      status === 409
        ? 'Organization is no longer pending.'
        : status === 404
          ? 'Campus organization not found.'
          : status === 400
            ? 'Invalid review decision.'
            : status === 503
              ? 'Approval database migration is not available.'
            : 'Failed to review campus organization.';
    return NextResponse.json({ error: message }, { status });
  }

  console.info('[platform:campus-review:decision]', {
    organizationId: parsedParams.data.id,
    actorUserId: auth.admin.id,
    action: decision.action,
  });

  return NextResponse.json({ success: true, organization: data });
}
