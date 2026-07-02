import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireCampusAuth, isAuthError } from '@/lib/college/api-auth';
import { getEffectiveInviteStatus } from '@/lib/college/invites';
import type { CampusInviteRow } from '@/lib/college/types';

export async function GET(): Promise<NextResponse> {
  const auth = await requireCampusAuth('invites:manage');
  if (isAuthError(auth)) return auth;

  const serviceClient = createServiceClient();

  const { data: invites, error } = await serviceClient
    .from('campus_invites')
    .select('id, email, token, status, invited_at, accepted_at, expires_at')
    .eq('org_id', auth.org.id)
    .order('invited_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 });
  }

  const rows: CampusInviteRow[] = (invites ?? []).map((invite) => ({
    ...invite,
    status: invite.status as CampusInviteRow['status'],
    effective_status: getEffectiveInviteStatus(invite),
  }));

  return NextResponse.json({ invites: rows });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const auth = await requireCampusAuth('invites:manage');
  if (isAuthError(auth)) return auth;

  let body: { action?: string; inviteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, inviteId } = body;
  if (!action || !inviteId) {
    return NextResponse.json({ error: 'Missing action or inviteId' }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  const { data: invite } = await serviceClient
    .from('campus_invites')
    .select('id, email, token, status, org_id')
    .eq('id', inviteId)
    .eq('org_id', auth.org.id)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (action === 'revoke') {
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending invitations can be revoked' }, { status: 400 });
    }

    const { error } = await serviceClient
      .from('campus_invites')
      .update({ status: 'revoked' })
      .eq('id', inviteId);

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'revoked' });
  }

  if (action === 'resend') {
    if (invite.status !== 'pending' && invite.status !== 'expired') {
      return NextResponse.json(
        { error: 'Only pending or expired invitations can be resent' },
        { status: 400 }
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await serviceClient
      .from('campus_invites')
      .update({ status: 'pending', expires_at: expiresAt.toISOString(), invited_at: new Date().toISOString() })
      .eq('id', inviteId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to refresh invitation' }, { status: 500 });
    }

    const { sendCampusInviteEmail } = await import('@/lib/college/send-invite-email');
    const sent = await sendCampusInviteEmail({
      email: invite.email,
      token: invite.token,
      orgName: auth.org.name,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to resend email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status: 'pending' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
