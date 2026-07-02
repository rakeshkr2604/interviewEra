import Link from 'next/link';
import Image from 'next/image';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Shield, Zap } from 'lucide-react';
import { AuthBrandChipIcon, AUTH_BRAND_MARK_PATH } from '@/components/auth/AuthBrandChipIcon';
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { AuthPremiumShell } from '@/components/layout/AuthPremiumShell';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import { LoginForm } from './LoginForm';

import { authPageMetadata } from '@/lib/seo/metadata';
import { isSafePath } from '@/lib/auth/auth-params';
import type { SessionRedirectReason } from '@/lib/auth/auth-params';

export const metadata = authPageMetadata({
  title: 'Login',
  description: 'Sign in to InterviewEra — AI mock interviews tailored to your resume.',
  path: '/login',
});

interface LoginPageProps {
  searchParams: Promise<{ next?: string; email?: string; reason?: string }>;
}

type Bullet =
  | { kind: 'lucide'; icon: LucideIcon; text: string }
  | { kind: 'brand'; text: string };

const BULLETS: Bullet[] = [
  { kind: 'lucide', icon: Shield, text: 'Secure sign-in with email or Google' },
  { kind: 'lucide', icon: Zap, text: 'Resume-aware practice picks up where you left off' },
  { kind: 'brand', text: 'Free to start — upgrade when you want deeper analytics' },
];

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = isSafePath(params.next) ? params.next : undefined;
  const email = params.email?.trim() || undefined;
  const reason =
    params.reason === 'session_expired' || params.reason === 'session_required'
      ? (params.reason as SessionRedirectReason)
      : undefined;
  return (
    <div
      className="ie-landing-premium min-h-screen"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <AuthPremiumShell>
        <div className="mb-8 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80 sm:text-base"
            style={{ color: 'var(--accent-primary)' }}
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to home
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
                  Welcome back
                </h1>
                <p className="text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                  Continue mock interviews, review scores, and tighten your stories — same premium experience on every
                  screen.
                </p>
              </div>

              <ul className="mx-auto max-w-md space-y-3.5 text-left sm:max-w-lg lg:mx-0 lg:max-w-none">
                {BULLETS.map((item) => (
                  <li key={item.text} className="flex gap-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    <span
                      className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                      style={
                        item.kind === 'lucide'
                          ? {
                              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                              color: 'var(--accent-primary)',
                            }
                          : undefined
                      }
                    >
                      {item.kind === 'lucide' ? (() => {
                        const Icon = item.icon;
                        return <Icon className="size-4" aria-hidden />;
                      })() : (
                        <Image
                          src={AUTH_BRAND_MARK_PATH}
                          width={36}
                          height={36}
                          className="size-9 rounded-lg"
                          alt=""
                          aria-hidden
                        />
                      )}
                    </span>
                    <span className="leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </>
          }
          right={<LoginForm next={next} email={email} reason={reason} />}
        />
      </AuthPremiumShell>
    </div>
  );
}
