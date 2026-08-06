'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { AuthLoadingButton } from '@/components/auth/AuthLoadingButton';
import { PasswordField } from '@/components/auth/PasswordField';
import { isAuthV2Enabled } from '@/lib/auth/flags';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';
import { IE_FIELD_SURFACE_STYLE, IE_INPUT_CLASS } from '@/lib/theme/component-classes';

const inputStyle = IE_FIELD_SURFACE_STYLE;

export function HiringSignupFields() {
  const router = useRouter();
  const { trackSignupStarted, trackVerificationSent } = useAuthAnalytics();
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    trackSignupStarted({ flow: 'signup', intent: 'business', method: 'email' });

    try {
      if (!companyName.trim()) {
        setError('Please enter your company name.');
        return;
      }
      if (!fullName.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid work email.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }

      const response = await fetch('/api/hiring/signup-workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          companyName,
          companySize: companySize.trim() || undefined,
        }),
      });

      const body = (await response.json()) as {
        error?: string;
        userId?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(body.error ?? 'Signup failed.');
        return;
      }

      const emailDomain = email.includes('@') ? email.split('@')[1] : undefined;
      trackVerificationSent({ intent: 'business', email_domain: emailDomain });

      if (isAuthV2Enabled()) {
        router.push(
          `/auth/verify-pending?email=${encodeURIComponent(email)}&intent=business&next=${encodeURIComponent('/hiring/dashboard')}`,
        );
        return;
      }

      router.push(`/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/hiring/dashboard')}`);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormCard
      eyebrow="Hiring Teams"
      title="Create your hiring workspace"
      subtitle="Evaluate candidates with structured AI interviews and a shared pipeline."
      badge={<ThemeToggle />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        {[
          {
            id: 'company-name',
            label: 'Company name',
            value: companyName,
            set: setCompanyName,
            type: 'text' as const,
            auto: 'organization',
            placeholder: 'e.g., Acme Labs',
          },
          {
            id: 'full-name',
            label: 'Your name',
            value: fullName,
            set: setFullName,
            type: 'text' as const,
            auto: 'name',
            placeholder: 'e.g., Ananya Mehta',
          },
          {
            id: 'email',
            label: 'Work email',
            value: email,
            set: setEmail,
            type: 'email' as const,
            auto: 'email',
            placeholder: 'you@company.com',
          },
          {
            id: 'company-size',
            label: 'Company size (optional)',
            value: companySize,
            set: setCompanySize,
            type: 'text' as const,
            auto: 'off',
            placeholder: 'e.g., 11–50',
          },
        ].map((field) => (
          <div key={field.id}>
            <label
              htmlFor={field.id}
              className="mb-1 block text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {field.label}
            </label>
            <input
              id={field.id}
              type={field.type}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              autoComplete={field.auto}
              required={field.id !== 'company-size'}
              className={IE_INPUT_CLASS}
              style={inputStyle}
            />
          </div>
        ))}

        <PasswordField
          id="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
        />

        {error ? <AuthErrorBanner message={error} /> : null}

        <AuthLoadingButton loading={loading} loadingLabel="Creating workspace…">
          Create hiring workspace
        </AuthLoadingButton>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have a hiring workspace?{' '}
          <Link
            href="/login?next=%2Fhiring%2Fdashboard"
            className="font-semibold"
            style={{ color: 'var(--accent-primary)' }}
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthFormCard>
  );
}
