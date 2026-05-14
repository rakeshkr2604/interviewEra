'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const inputClass = cn(
  'w-full rounded-lg border-2 px-4 py-2.5 text-sm shadow-none transition-[color,box-shadow]',
  'focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-100 focus-visible:outline-none',
  'border-gray-200 bg-white text-gray-900 placeholder:text-gray-400'
);

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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">T&P Officer Registration</h1>
        <p className="mt-2 text-sm text-gray-600">Set up your college account for placement training.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="college-name" className="block text-sm font-medium text-gray-700">
            College Name <span className="text-red-500">*</span>
          </label>
          <input
            id="college-name"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            placeholder="e.g., Indian Institute of Technology"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="officer-name" className="block text-sm font-medium text-gray-700">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            id="officer-name"
            value={officerName}
            onChange={(e) => setOfficerName(e.target.value)}
            placeholder="e.g., Priya Sharma"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tp@college.edu"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label htmlFor="student-count" className="block text-sm font-medium text-gray-700">
            Estimated Student Count <span className="text-red-500">*</span>
          </label>
          <input
            id="student-count"
            type="number"
            min="1"
            value={studentCount}
            onChange={(e) => setStudentCount(e.target.value)}
            placeholder="e.g., 150"
            className={inputClass}
            required
          />
          <p className="mt-1 text-xs text-gray-500">Used for pricing and seat allocation.</p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            className={inputClass}
            required
          />
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
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
