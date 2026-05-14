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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Invitation Expired</h1>
          <p className="mt-2 text-sm text-gray-600">This invitation has already been accepted.</p>
          <p className="mt-4 text-sm text-gray-500">
            If you have questions, contact your T&P officer.
          </p>
        </div>
      </div>
    );
  }

  if (!invite || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-gray-600">
            The invitation link is invalid or has expired.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-10 items-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Join {org.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            You've been invited to join the InterviewEra placement training program.
          </p>
        </div>

        {user ? (
          <JoinInviteForm
            token={token}
            inviteEmail={invite.email}
            userEmail={user.email}
            orgId={org.id}
            orgName={org.name}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Sign in with your email to accept the invitation.
            </p>
            <Link
              href={`/login?email=${encodeURIComponent(invite.email)}`}
              className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Sign In
            </Link>
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link
                href={`/signup?email=${encodeURIComponent(invite.email)}`}
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Create one
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
