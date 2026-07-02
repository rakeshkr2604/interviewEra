'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_INPUT_CLASS,
  IE_LABEL_CLASS,
} from '@/lib/theme/component-classes';

const fieldSurface = IE_FIELD_SURFACE_STYLE;

export function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        const { signOutIfStaleAuth } = await import('@/lib/supabase/session');
        await signOutIfStaleAuth(supabase, error);
      }
      if (!cancelled) {
        setSessionReady(Boolean(data.session) && !error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (sessionReady === null) {
    return (
      <FreeToolFormCard
        headerEyebrow="Account"
        headerTitle="Loading…"
        headerSubtitle="Checking your session"
        headerBadge={<ThemeToggle />}
      >
        <div className="p-6 text-center text-sm sm:p-7" style={{ color: 'var(--text-secondary)' }}>
          One moment…
        </div>
      </FreeToolFormCard>
    );
  }

  if (!sessionReady) {
    return (
      <FreeToolFormCard
        headerEyebrow="Account"
        headerTitle="Link expired or invalid"
        headerSubtitle="Request a new reset link to continue."
        headerBadge={<ThemeToggle />}
      >
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Open the password reset link from your email, or start over from forgot password.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex text-sm font-semibold"
            style={{ color: 'var(--accent-primary)' }}
          >
            Request new link →
          </Link>
          <p>
            <Link href="/login" className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
              Back to sign in
            </Link>
          </p>
        </div>
      </FreeToolFormCard>
    );
  }

  return (
    <FreeToolFormCard
      headerEyebrow="Account"
      headerTitle="Choose a new password"
      headerSubtitle="Use at least 8 characters. You’ll be signed in on success."
      headerBadge={<ThemeToggle />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        <div className={IE_FIELD_GROUP_CLASS}>
          <label htmlFor="new-password" className={IE_LABEL_CLASS}>
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
            autoComplete="new-password"
            className={IE_INPUT_CLASS}
            style={fieldSurface}
            aria-invalid={error ? true : undefined}
          />
        </div>

        <div className={IE_FIELD_GROUP_CLASS}>
          <label htmlFor="confirm-password" className={IE_LABEL_CLASS}>
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            minLength={8}
            required
            autoComplete="new-password"
            className={IE_INPUT_CLASS}
            style={fieldSurface}
            aria-invalid={error ? true : undefined}
          />
        </div>

        {error ? <AuthErrorBanner message={error} /> : null}

        <FormSubmitButton loading={loading} loadingLabel="Updating…">
          Update password
        </FormSubmitButton>
      </form>
    </FreeToolFormCard>
  );
}
