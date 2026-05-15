'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function CollegeSignupForm() {
  const [collegeName, setCollegeName] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const inputStyle = {
    border: '1.5px solid var(--card-border)',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
  } as React.CSSProperties;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setLoading(true);

    try {
      if (!collegeName.trim()) {
        setFeedback({ kind: 'error', text: 'Please enter college name.' });
        return;
      }
      if (!officerName.trim()) {
        setFeedback({ kind: 'error', text: 'Please enter your name.' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setFeedback({ kind: 'error', text: 'Please enter a valid email.' });
        return;
      }
      if (!/^\+?[0-9]{10,}$/.test(phone.replace(/\D/g, ''))) {
        setFeedback({ kind: 'error', text: 'Please enter a valid phone number.' });
        return;
      }
      if (!studentCount || parseInt(studentCount) < 1) {
        setFeedback({ kind: 'error', text: 'Please enter estimated student count.' });
        return;
      }
      if (password.length < 8) {
        setFeedback({ kind: 'error', text: 'Password must be at least 8 characters.' });
        return;
      }

      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: officerName,
            role: 'college_admin',
          },
        },
      });

      if (signUpError) {
        setFeedback({ kind: 'error', text: signUpError.message });
        return;
      }

      if (!data.user) {
        setFeedback({ kind: 'error', text: 'Account creation failed.' });
        return;
      }

      const response = await fetch('/api/college/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user.id,
          collegeName,
          studentCount: parseInt(studentCount),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setFeedback({ kind: 'error', text: err.error || 'Failed to create organization.' });
        return;
      }

      setFeedback({
        kind: 'success',
        text: 'Account created! Redirecting to your dashboard...',
      });

      setTimeout(() => {
        router.push('/college/dashboard');
      }, 1500);
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-lg p-6"
      style={{ background: 'var(--card-bg)', border: '1.5px solid var(--card-border)' }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>T&P Officer Registration</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Set up your college account for placement training.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="college-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            College Name <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="college-name"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder="e.g., Indian Institute of Technology"
            autoComplete="organization"
            className="w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-[border-color] focus-visible:outline-none focus-visible:border-[var(--accent-primary)]"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="officer-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Your Name <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="officer-name"
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
            placeholder="e.g., Priya Sharma"
            autoComplete="name"
            className="w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-[border-color] focus-visible:outline-none focus-visible:border-[var(--accent-primary)]"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Email <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tp@college.edu"
            autoComplete="email"
            className="w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-[border-color] focus-visible:outline-none focus-visible:border-[var(--accent-primary)]"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Phone <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            autoComplete="tel"
            className="w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-[border-color] focus-visible:outline-none focus-visible:border-[var(--accent-primary)]"
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="student-count" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Estimated Student Count <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="student-count"
            type="number"
            min="1"
            value={studentCount}
            onChange={(e) => setStudentCount(e.target.value)}
            placeholder="e.g., 150"
            autoComplete="off"
            className="w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-[border-color] focus-visible:outline-none focus-visible:border-[var(--accent-primary)]"
            style={inputStyle}
            required
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Used for pricing and seat allocation.</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Password <span style={{ color: 'var(--accent-danger)' }}>*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-[border-color] focus-visible:outline-none focus-visible:border-[var(--accent-primary)]"
            style={inputStyle}
            required
          />
        </div>

        {feedback && (
          <div
            className="rounded-lg border px-4 py-3 text-sm font-medium"
            style={{
              background: feedback.kind === 'error'
                ? 'color-mix(in srgb, var(--accent-danger) 8%, transparent)'
                : 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
              borderColor: feedback.kind === 'error'
                ? 'color-mix(in srgb, var(--accent-danger) 30%, transparent)'
                : 'color-mix(in srgb, var(--accent-success) 30%, transparent)',
              color: feedback.kind === 'error' ? 'var(--accent-danger)' : 'var(--accent-success)',
            }}
            role={feedback.kind === 'error' ? 'alert' : 'status'}
          >
            {feedback.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
          style={{ background: 'var(--accent-primary)' }}
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent-primary)' }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
