'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthLoadingButton } from '@/components/auth/AuthLoadingButton';
import {
  clearCampusSignupDraft,
  readCampusSignupDraft,
} from '@/lib/college/signup-continuation';
import { IE_FIELD_SURFACE_STYLE, IE_INPUT_CLASS } from '@/lib/theme/component-classes';

type CreateOrgBody = {
  error?: string;
  message?: string;
  status?: 'approved' | 'pending' | 'pending_verification' | 'rejected';
};

export function CampusSetupForm({ verified }: { verified: boolean }) {
  const router = useRouter();
  const [collegeName, setCollegeName] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const draft = readCampusSignupDraft();
    if (!draft) return;
    setCollegeName(draft.collegeName);
    setStudentCount(String(draft.studentCount));
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/college/create-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          collegeName: collegeName.trim(),
          studentCount: Number.parseInt(studentCount, 10),
        }),
      });
      const body = (await response.json().catch(() => null)) as CreateOrgBody | null;

      if (response.status === 409) {
        clearCampusSignupDraft();
        if (body?.status === 'approved') {
          router.replace('/college/dashboard');
        } else {
          router.replace(
            `/college/setup?status=${body?.status === 'rejected' ? 'rejected' : 'pending'}`,
          );
        }
        router.refresh();
        return;
      }

      if (!response.ok) {
        setError(body?.error ?? 'Could not submit your campus application.');
        return;
      }

      clearCampusSignupDraft();
      if (body?.status === 'approved') {
        router.replace('/college/dashboard');
      } else {
        router.replace('/college/setup?status=pending');
      }
      router.refresh();
    } catch {
      setError('Network connection issue. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFormCard
      eyebrow="Campus setup"
      title="Continue setting up your campus"
      subtitle={
        verified
          ? 'Email verified. Submit your campus details for Founder review.'
          : 'Submit your campus details for Founder review.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        <div>
          <label
            htmlFor="college-name"
            className="mb-1 block text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            College name
          </label>
          <input
            id="college-name"
            value={collegeName}
            onChange={(event) => setCollegeName(event.target.value)}
            autoComplete="organization"
            required
            maxLength={160}
            className={IE_INPUT_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          />
        </div>

        <div>
          <label
            htmlFor="student-count"
            className="mb-1 block text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Estimated student count
          </label>
          <input
            id="student-count"
            type="number"
            min={1}
            max={100000}
            value={studentCount}
            onChange={(event) => setStudentCount(event.target.value)}
            required
            className={IE_INPUT_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          />
        </div>

        {error ? <AuthErrorBanner message={error} /> : null}

        <AuthLoadingButton loading={loading} loadingLabel="Submitting application…">
          Submit campus application
        </AuthLoadingButton>
      </form>
    </AuthFormCard>
  );
}
