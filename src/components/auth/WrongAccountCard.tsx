'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export interface WrongAccountCardProps {
  inviteEmail: string;
  userEmail: string;
  loginHref: string;
}

export function WrongAccountCard({ inviteEmail, userEmail, loginHref }: WrongAccountCardProps) {
  return (
    <div className="space-y-5">
      <div
        className="rounded-xl p-4"
        style={{
          background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent-warning) 30%, transparent)',
        }}
      >
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--accent-warning)' }} aria-hidden />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Wrong account
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              This invitation is for <strong>{inviteEmail}</strong> but you&apos;re signed in as{' '}
              <strong>{userEmail}</strong>. Please sign out and sign in with the correct account.
            </p>
          </div>
        </div>
      </div>

      <Link
        href={loginHref}
        className="flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 py-3 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'var(--accent-primary)' }}
      >
        Sign in with {inviteEmail}
      </Link>
    </div>
  );
}
