import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token, inviteEmail, orgId } = await request.json();

    if (!token || !inviteEmail || !orgId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: invite, error: inviteError } = await serviceClient
      .from('campus_invites')
      .select('id, org_id, email, status')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
    }

    if (invite.email.toLowerCase() !== inviteEmail.toLowerCase()) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 400 });
    }

    if (invite.org_id !== orgId) {
      return NextResponse.json({ error: 'Organization mismatch' }, { status: 400 });
    }

    const { data: org } = await serviceClient
      .from('campus_organizations')
      .select('id, seat_count')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { count: currentStudents } = await serviceClient
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('campus_org_id', orgId);

    const { count: pendingInvites } = await serviceClient
      .from('campus_invites')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'pending');

    const used = (currentStudents ?? 0) + ((pendingInvites ?? 0) - 1);

    if (used >= org.seat_count) {
      return NextResponse.json({ error: 'No seats available' }, { status: 422 });
    }

    const { error: updateInviteError } = await serviceClient
      .from('campus_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateInviteError) {
      console.error('[college/join] Update invite error:', updateInviteError);
      return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
    }

    const { error: updateUserError } = await serviceClient
      .from('users')
      .update({
        campus_org_id: orgId,
        plan_tier: 'campus',
      })
      .eq('id', user.id);

    if (updateUserError) {
      console.error('[college/join] Update user error:', updateUserError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    // Write enrollment row — college_enrollments is the source of truth for the
    // admin dashboard. Use upsert so re-runs of the accept flow are idempotent.
    const { error: enrollError } = await serviceClient
      .from('college_enrollments')
      .upsert(
        {
          user_id: user.id,
          college_id: orgId,
          enrollment_status: 'active',
          enrolled_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,college_id' }
      );

    if (enrollError) {
      // Non-fatal: user is updated; log and continue so the student is not stuck.
      console.error('[college/join] Enrollment row write error:', enrollError);
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
    });
  } catch (err) {
    console.error('[college/join] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
