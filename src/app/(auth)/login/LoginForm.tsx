'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuthRedirectOrigin } from '@/lib/auth/redirect-origin';
import { createClient } from '@/lib/supabase/client';
import { Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={cn('size-[18px] shrink-0', className)} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const inputClass = cn(
  'w-full rounded-xl border-2 px-4 py-2.5 text-sm shadow-none transition-[color,box-shadow]',
  'focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:outline-none',
);

const cardInnerBg = 'color-mix(in srgb, var(--card-bg) 94%, transparent)';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setOauthLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAuthRedirectOrigin()}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        setOauthLoading(false);
      }
    } catch {
      setError('Failed to initiate Google login. Please try again.');
      setOauthLoading(false);
    }
  }

  const isDisabled = loading || oauthLoading;

  return (
    <FreeToolFormCard
      headerEyebrow="Account"
      headerTitle="Welcome back"
      headerSubtitle="Sign in to your InterviewEra account"
      headerBadge={<ThemeToggle />}
    >
      <div className="space-y-5 p-5 sm:p-6">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-[transform,box-shadow] hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <GoogleMark />
          {oauthLoading ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <span className="w-full border-t-2" style={{ borderColor: 'var(--card-border)' }} />
          </div>
          <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.16em]">
            <span className="px-3 py-0.5" style={{ background: cardInnerBg, color: 'var(--text-muted)' }}>
              or
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className={inputClass}
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="password" className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium transition-opacity hover:opacity-80 sm:text-sm"
                style={{ color: 'var(--accent-primary)' }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className={cn(inputClass, 'pr-11')}
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg transition-[background,color] hover:bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]"
                style={{ color: 'var(--text-muted)' }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="size-4" strokeWidth={2} /> : <Eye className="size-4" strokeWidth={2} />}
              </button>
            </div>
          </div>

          {error ? (
            <p
              className="rounded-xl border-2 px-4 py-3 text-sm font-medium"
              role="alert"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                color: 'var(--accent-danger)',
              }}
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isDisabled}
            className="landing-cta-lift mt-2 inline-flex h-12 w-full items-center justify-center rounded-[14px] px-8 text-base font-semibold text-white disabled:pointer-events-none disabled:opacity-60 sm:h-[3.25rem]"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
              boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="pt-1 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/signup"
            className="font-semibold transition-opacity hover:opacity-90"
            style={{ color: 'var(--accent-primary)' }}
          >
            Sign up free
          </Link>
        </p>
      </div>
    </FreeToolFormCard>
  );
}
