import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { trackCampusEvent } from '@/lib/analytics/campus-events';
import { resolveCampusOrgVerificationStatus } from '@/lib/college/org-verification';

const bodySchema = z.object({
  collegeName: z.string().trim().min(2, 'College name is required.').max(160),
  studentCount: z.coerce.number().int().min(1).max(100_000),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!user.email_confirmed_at) {
      return Response.json({ error: 'Email verification is required.' }, { status: 403 });
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return Response.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid organization details.' },
        { status: 400 },
      );
    }
    const { collegeName, studentCount } = parsed.data;
    const userId = user.id;

    const serviceClient = createServiceClient();

    const { data: existingOrg } = await serviceClient
      .from('campus_organizations')
      .select('id, verification_status')
      .eq('admin_user_id', userId)
      .maybeSingle();

    if (existingOrg) {
      return Response.json(
        {
          error: 'Organization already exists for this account.',
          status: existingOrg.verification_status,
        },
        { status: 409 },
      );
    }

    const verificationStatus = resolveCampusOrgVerificationStatus(user.email);

    const { data: insertedOrg, error: orgError } = await serviceClient
      .from('campus_organizations')
      .insert({
        name: collegeName,
        admin_user_id: userId,
        seat_count: studentCount,
        plan_start: new Date().toISOString().split('T')[0],
        verification_status: verificationStatus,
      })
      .select('id')
      .single();

    if (orgError || !insertedOrg) {
      return Response.json(
        { error: `Failed to create organization: ${orgError?.message ?? 'unknown'}` },
        { status: 500 },
      );
    }

    if (verificationStatus === 'approved') {
      const { error: userError } = await serviceClient
        .from('users')
        .update({ plan_tier: 'campus_admin' })
        .eq('id', userId);

      if (userError) {
        return Response.json({ error: `Failed to update user: ${userError.message}` }, { status: 500 });
      }
    }

    trackCampusEvent('campus_workspace_created', {
      userId,
      org_id: insertedOrg.id,
      seat_count: studentCount,
      college_name: collegeName,
      verification_status: verificationStatus,
    });

    return Response.json({
      success: true,
      status: verificationStatus === 'approved' ? 'approved' : 'pending_verification',
      message:
        verificationStatus === 'approved'
          ? 'Campus workspace is ready.'
          : 'Application received. Our team will verify your campus workspace within 1–2 business days.',
    });
  } catch (error) {
    console.error('[college/create-org]', error);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

