import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { AuthBrandChipIcon } from '@/components/auth/AuthBrandChipIcon';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { authPageMetadata } from '@/lib/seo/metadata';

export const metadata = authPageMetadata({
  title: 'Forgot password',
  description: 'Reset your InterviewEra account password via email.',
  path: '/forgot-password',
});

const BULLETS = [
  { icon: Mail, text: 'One link in your inbox — expires for your security' },
  { icon: ShieldCheck, text: 'Same secure auth as sign-in and Google OAuth' },
  { icon: KeyRound, text: 'After opening the link, you’ll set a new password on the next step' },
] as const;

export default function ForgotPasswordPage() {
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
                <AuthBrandChipIcon />
                <BrandWordmarkSplit interviewClassName="font-medium" eraClassName="font-semibold" />
              </div>

              <div className="space-y-4">
                <h1 className="text-[2rem] font-bold leading-[1.08] tracking-tight text-balance sm:text-4xl md:text-5xl md:leading-[1.05]">
                  Forgot password?
                </h1>
                <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                  Enter the email you use for{' '}
                  <BrandWordmarkSplit
                    className="inline text-[inherit]"
                    interviewClassName="font-medium"
                    eraClassName="font-semibold"
                  />
                  . We&apos;ll send a link to set a new password — no support ticket needed.
                </p>
              </div>

              <ul className="mx-auto max-w-md space-y-3.5 text-left sm:max-w-lg lg:mx-0 lg:max-w-none">
                {BULLETS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex gap-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    <span
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
            </>
          }
          right={<ForgotPasswordForm />}
        />
      </AuthPremiumShell>
    </div>
  );
}
