'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface JoinInviteFormProps {
  token: string;
  inviteEmail: string;
  userEmail: string | undefined;
  orgId: string;
  orgName: string;
}

export function JoinInviteForm({
  token,
  inviteEmail,
  userEmail,
  orgId,
  orgName,
}: JoinInviteFormProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();
  const calledRef = useRef(false);

  const emailMismatch = Boolean(userEmail && userEmail.toLowerCase() !== inviteEmail.toLowerCase());

  async function handleAccept() {
    if (loading) return;
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/college/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, inviteEmail, orgId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({ kind: 'error', text: data.error || 'Failed to accept invitation.' });
        setLoading(false);
        return;
      }

      setFeedback({ kind: 'success', text: `You've joined ${orgName}! Taking you to your dashboard…` });
      setTimeout(() => router.push('/dashboard'), 1200);
    } catch {
      setFeedback({ kind: 'error', text: 'An unexpected error occurred. Please try again.' });
      setLoading(false);
    }
  }

  // Auto-accept when the logged-in email matches the invite — the student
  // already clicked the invite link and authenticated, so this extra step adds
  // no security value and frequently causes drop-off.
  useEffect(() => {
    if (!emailMismatch && !calledRef.current) {
      calledRef.current = true;
      void handleAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (emailMismatch) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Wrong account</p>
              <p className="mt-1 text-sm text-amber-800">
                This invitation is for <strong>{inviteEmail}</strong> but you're signed in as{' '}
                <strong>{userEmail}</strong>. Please sign out and sign in with the correct account,
                or create a new account using your college email.
              </p>
            </div>
          </div>
        </div>

        <a
          href={`/login?email=${encodeURIComponent(inviteEmail)}&next=${encodeURIComponent(`/college/join/${token}`)}`}
          className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Sign in with {inviteEmail}
        </a>
      </div>
    );
  }

  if (feedback?.kind === 'success') {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <div>
          <p className="text-base font-semibold text-gray-900">{feedback.text}</p>
        </div>
      </div>
    );
  }

  if (feedback?.kind === 'error') {
    return (
      <div className="space-y-4">
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-medium text-red-800">{feedback.text}</p>
        </div>
        <button
          onClick={() => { calledRef.current = false; void handleAccept(); }}
          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium text-gray-600">Accepting your invitation…</p>
    </div>
  );
}
