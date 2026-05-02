import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Lock, Sparkles } from 'lucide-react';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Set new password | InterviewEra',
  description: 'Choose a new password for your InterviewEra account.',
};

export default function ResetPasswordPage() {
  return (
    <div
      className="ie-landing-premium min-h-screen"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <AuthPremiumShell>
        <div className="mb-8 sm:mb-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to sign in
          </Link>
        </div>

        <AuthSplitLayout
          left={
            <>
              <div
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide lg:mx-0"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  color: 'var(--text-primary)',
                }}
              >
                <Sparkles className="size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                InterviewEra
              </div>

              <div className="space-y-4">
                <div
                  className="mx-auto flex size-14 items-center justify-center rounded-2xl lg:mx-0"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Lock className="size-7" aria-hidden />
                </div>
                <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
                  Set your new password
                </h1>
                <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                  You reached this page from your reset email. Pick a strong password — you&apos;ll continue to the
                  dashboard when it saves.
                </p>
              </div>
            </>
          }
          right={<ResetPasswordForm />}
        />
      </AuthPremiumShell>
    </div>
  );
}
