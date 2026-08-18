import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { authPageMetadata } from '@/lib/seo/metadata';
import { JoinInviteForm } from './JoinInviteForm';
import { getEffectiveInviteStatus } from '@/lib/college/invites';

export const metadata = authPageMetadata({
  title: 'Join Campus Program',
  description: 'Accept your invitation to join the InterviewEra campus placement program.',
  path: '/college/join/[token]',
});

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getInviteData(token: string) {
  try {
    const serviceClient = createServiceClient();

    const { data: invite, error } = await serviceClient
      .from('campus_invites')
      .select('id, org_id, email, status, invited_at, accepted_at, expires_at')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return { invite: null, org: null };
    }

    const effectiveStatus = getEffectiveInviteStatus(invite);

    if (invite.status === 'accepted') {
      return { invite, org: null, error: 'accepted' as const };
    }

    if (effectiveStatus === 'expired') {
      return { invite, org: null, error: 'expired' as const };
    }

    if (effectiveStatus === 'revoked') {
      return { invite, org: null, error: 'revoked' as const };
    }

    const { data: org } = await serviceClient
      .from('campus_organizations')
      .select('id, name, verification_status')
      .eq('id', invite.org_id)
      .single();

    if (org?.verification_status !== 'approved') {
      return { invite, org: null, error: 'pending_verification' as const };
    }

    return { invite, org };
  } catch {
    return { invite: null, org: null };
  }
}

export default async function JoinInvitePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { invite, org, error } = await getInviteData(token);

  if (error === 'pending_verification') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
        >
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Campus Verification Pending
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This campus organization is pending verification. Try again after it has been approved.
          </p>
        </div>
      </div>
    );
  }

  if (error === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent-warning) 14%, transparent)' }}
          >
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Invitation Already Used</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This invitation link has already been accepted. If you already have an account, sign in
            to continue your placement preparation.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 items-center rounded-xl px-6 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ background: 'var(--accent-primary)' }}
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error === 'expired' || error === 'revoked') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent-warning) 14%, transparent)' }}
          >
            <span className="text-2xl">{error === 'revoked' ? '🚫' : '⏰'}</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {error === 'revoked' ? 'Invitation Revoked' : 'Invitation Expired'}
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {error === 'revoked'
              ? 'This invitation has been revoked by your T&P officer. Contact them for a new invitation.'
              : 'This invitation link has expired. Contact your T&P officer for a new invitation.'}
          </p>
        </div>
      </div>
    );
  }

  if (!invite || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)' }}
          >
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Invalid Invitation</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            This invitation link is invalid or has expired. Contact your T&amp;P officer for a new
            invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        {/* Org badge */}
        <div className="mb-6 text-center">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
              border: '1px solid color-mix(in srgb, var(--accent-primary) 25%, transparent)',
            }}
          >
            🏛️ {org.name}
          </span>
        </div>

        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
        >
          {user ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Joining your campus program</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                  Setting up your account for {org.name}…
                </p>
              </div>
              <JoinInviteForm
                token={token}
                inviteEmail={invite.email}
                userEmail={user.email}
                orgId={org.id}
                orgName={org.name}
              />
            </>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>You&apos;re invited!</h1>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <strong>{org.name}</strong> has invited you to join their campus placement
                  preparation program on InterviewEra.
                </p>
              </div>

              <div
                className="mb-6 rounded-xl p-4 text-sm"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--card-border)',
                }}
              >
                <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Your campus plan includes:</p>
                <ul className="mt-2 space-y-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <li>✓ Unlimited AI mock interviews</li>
                  <li>✓ Detailed scoring across 5 dimensions</li>
                  <li>✓ Progress tracking and placement readiness</li>
                  <li>✓ Model answer comparison and Improvement Guidance</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/college/join/${token}`)}`}
                  className="block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:opacity-90"
                  style={{ background: 'var(--accent-primary)' }}
                >
                  Sign In to Accept
                </Link>
                <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  New to InterviewEra?{' '}
                  <Link
                    href={`/signup?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/college/join/${token}`)}`}
                    className="font-semibold hover:underline"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    Create a free account
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Invitation sent to {invite.email}
        </p>
      </div>
    </div>
  );
}
