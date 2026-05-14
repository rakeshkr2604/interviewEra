'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
}: JoinInviteFormProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const router = useRouter();

  const emailMismatch = userEmail && userEmail !== inviteEmail;

  async function handleAccept() {
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/college/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          inviteEmail,
          orgId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedback({
          kind: 'error',
          text: data.error || 'Failed to accept invitation.',
        });
        return;
      }

      setFeedback({
        kind: 'success',
        text: 'Invitation accepted! Redirecting...',
      });

      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Email:</span> {inviteEmail}
        </p>
        {emailMismatch && (
          <p className="mt-2 text-xs text-blue-800">
            You're signed in as <span className="font-semibold">{userEmail}</span>. Make sure
            this is the correct account.
          </p>
        )}
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-lg border px-4 py-3 text-sm font-medium',
            feedback.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          )}
          role={feedback.kind === 'error' ? 'alert' : 'status'}
        >
          {feedback.text}
        </div>
      )}

      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
      >
        {loading ? 'Accepting...' : 'Accept Invitation'}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By accepting, you agree to join this campus program and can access unlimited practice interviews.
      </p>
    </div>
  );
}
