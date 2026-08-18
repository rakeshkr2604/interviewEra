'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { AuthLoadingButton } from '@/components/auth/AuthLoadingButton';
import { PasswordField } from '@/components/auth/PasswordField';
import { useAuthAnalytics } from '@/hooks/use-auth-analytics';
import {
  CAMPUS_SETUP_PATH,
  campusVerificationPendingPath,
  saveCampusSignupDraft,
} from '@/lib/college/signup-continuation';
import { authPasswordSchema } from '@/lib/validations/schemas';

import { IE_FIELD_SURFACE_STYLE, IE_INPUT_CLASS } from '@/lib/theme/component-classes';

const inputStyle = IE_FIELD_SURFACE_STYLE;

export function CollegeSignupFields() {
  const router = useRouter();
  const { trackSignupStarted, trackVerificationSent } = useAuthAnalytics();
  const [collegeName, setCollegeName] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    trackSignupStarted({ flow: 'signup', intent: 'college', method: 'email' });

    try {
      if (!collegeName.trim()) {
        setError('Please enter college name.');
        return;
      }
      if (!officerName.trim()) {
        setError('Please enter your name.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Please enter a valid email.');
        return;
      }
      if (!/^\+?[0-9]{10,}$/.test(phone.replace(/\D/g, ''))) {
        setError('Please enter a valid phone number.');
        return;
      }
      if (!studentCount || parseInt(studentCount) < 1) {
        setError('Please enter estimated student count.');
        return;
      }
      const passwordCheck = authPasswordSchema.safeParse(password);
      if (!passwordCheck.success) {
        setError(passwordCheck.error.issues[0]?.message ?? 'Password does not meet requirements.');
        return;
      }

      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: officerName,
          next: CAMPUS_SETUP_PATH,
          metadata: { role: 'college_admin' },
        }),
      });

      const signupBody = (await signupResponse.json()) as {
        error?: string;
        userId?: string;
        message?: string;
      };

      if (!signupResponse.ok) {
        setError(signupBody.error ?? 'Signup failed.');
        return;
      }

      if (!signupBody.userId) {
        setError('Account creation failed.');
        return;
      }

      saveCampusSignupDraft({
        collegeName: collegeName.trim(),
        studentCount: parseInt(studentCount, 10),
      });

      const emailDomain = email.includes('@') ? email.split('@')[1] : undefined;
      trackVerificationSent({ intent: 'college', email_domain: emailDomain });
      router.push(campusVerificationPendingPath(email));
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormCard
      eyebrow="Campus"
      title="Set up your campus workspace"
      subtitle="Bulk student onboarding and a T&P dashboard for placement season."
      badge={<ThemeToggle />}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        {[
          { id: 'college-name', label: 'College name', value: collegeName, set: setCollegeName, type: 'text', auto: 'organization', placeholder: 'e.g., Indian Institute of Technology' },
          { id: 'officer-name', label: 'Your name', value: officerName, set: setOfficerName, type: 'text', auto: 'name', placeholder: 'e.g., Priya Sharma' },
          { id: 'email', label: 'Work email', value: email, set: setEmail, type: 'email', auto: 'email', placeholder: 'tp@college.edu' },
          { id: 'phone', label: 'Phone', value: phone, set: setPhone, type: 'tel', auto: 'tel', placeholder: '+91 98765 43210' },
          { id: 'student-count', label: 'Estimated student count', value: studentCount, set: setStudentCount, type: 'number', auto: 'off', placeholder: 'e.g., 150' },
        ].map((field) => (
          <div key={field.id}>
            <label htmlFor={field.id} className="mb-1 block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {field.label}
            </label>
            <input
              id={field.id}
              type={field.type}
              min={field.type === 'number' ? 1 : undefined}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              autoComplete={field.auto}
              required
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

        <AuthLoadingButton loading={loading} loadingLabel="Creating account…">
          Create account and verify email
        </AuthLoadingButton>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Joining as a student?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Use your invite link
          </Link>
        </p>
        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <Link href="/login" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Log in
          </Link>
        </p>
      </form>
    </AuthFormCard>
  );
}
