import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { authPageMetadata } from '@/lib/seo/metadata';
import { JoinInviteForm } from './JoinInviteForm';

export const metadata = authPageMetadata({
  title: 'Join Campus Program',
  description: 'Accept your invitation to join the InterviewEra campus placement program.',
  path: '/college/join/[token]',
});

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getInviteData(token: string) {
  const serviceClient = createServiceClient();

  const { data: invite, error } = await serviceClient
    .from('campus_invites')
    .select('id, org_id, email, status, invited_at, accepted_at')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return { invite: null, org: null };
  }

  if (invite.status === 'accepted') {
    return { invite, org: null, error: 'expired' };
  }

  const { data: org } = await serviceClient
    .from('campus_organizations')
    .select('id, name')
    .eq('id', invite.org_id)
    .single();

  return { invite, org };
}

export default async function JoinInvitePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { invite, org, error } = await getInviteData(token);

  if (error === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--page-gradient, #f8fafc)' }}>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <span className="text-2xl">⏰</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Invitation Already Used</h1>
          <p className="mt-2 text-sm text-gray-600">
            This invitation link has already been accepted. If you already have an account, sign in
            to continue your placement preparation.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 items-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!invite || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--page-gradient, #f8fafc)' }}>
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-gray-600">
            This invitation link is invalid or has expired. Contact your T&amp;P officer for a new
            invitation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--page-gradient, #f8fafc)' }}>
      <div className="w-full max-w-md">
        {/* Org badge */}
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            🏛️ {org.name}
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {user ? (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900">Joining your campus program</h1>
                <p className="mt-2 text-sm text-gray-500">
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
                <h1 className="text-2xl font-bold text-gray-900">You&apos;re invited!</h1>
                <p className="mt-2 text-sm text-gray-600">
                  <strong>{org.name}</strong> has invited you to join their campus placement
                  preparation program on InterviewEra.
                </p>
              </div>

              <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-medium text-gray-900">Your campus plan includes:</p>
                <ul className="mt-2 space-y-1.5 text-gray-600">
                  <li>✓ Unlimited AI mock interviews</li>
                  <li>✓ Detailed scoring across 5 dimensions</li>
                  <li>✓ Progress tracking and placement readiness</li>
                  <li>✓ Interview replay and model answer comparison</li>
                </ul>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/college/join/${token}`)}`}
                  className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Sign In to Accept
                </Link>
                <p className="text-center text-xs text-gray-500">
                  New to InterviewEra?{' '}
                  <Link
                    href={`/signup?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(`/college/join/${token}`)}`}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Create a free account
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          Invitation sent to {invite.email}
        </p>
      </div>
    </div>
  );
}
