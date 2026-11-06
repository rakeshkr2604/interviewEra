'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircle2, Clock, FileSearch, Lock, Sparkles, XCircle } from 'lucide-react';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';
import type { ResumeReviewQuota } from '@/lib/resume-review/quota';

export type ResumeReviewRequestView = {
  id: string;
  resumeId: string | null;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  notes: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type ResumeOption = {
  id: string;
  createdAt: string;
  isPrimary: boolean;
};

const STATUS_COPY: Record<ResumeReviewRequestView['status'], { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'var(--accent-warning)' },
  scheduled: { label: 'Scheduled', color: 'var(--accent-primary)' },
  completed: { label: 'Completed', color: 'var(--accent-success)' },
  cancelled: { label: 'Cancelled', color: 'var(--text-muted)' },
};

function StatusBadge({ status }: { status: ResumeReviewRequestView['status'] }) {
  const copy = STATUS_COPY[status];
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: 'color-mix(in srgb, ' + copy.color + ' 16%, transparent)', color: copy.color }}
    >
      {copy.label}
    </span>
  );
}

function resumeLabel(resumeId: string | null, resumes: ResumeOption[]): string {
  if (!resumeId) return 'No resume attached';
  const match = resumes.find((r) => r.id === resumeId);
  if (!match) return 'Resume (deleted)';
  return `Resume uploaded ${formatDateTimeEnIn(match.createdAt)}${match.isPrimary ? ' · Primary' : ''}`;
}

function UpsellCard({ planActive, planTier }: { planActive: boolean; planTier: string }) {
  const isPaidButInactive = (planTier === 'starter' || planTier === 'pro') && !planActive;
  return (
    <section className="dashboard-premium-card px-6 py-8 text-center sm:px-7">
      <div
        className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}
      >
        <Lock className="size-6" style={{ color: 'var(--accent-primary)' }} aria-hidden />
      </div>
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        {isPaidButInactive ? 'Your plan has expired' : 'Starter/Pro perk'}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {isPaidButInactive
          ? 'Resume review sessions are available while your plan is active. Renew to request one.'
          : 'A 1:1 human resume review session is included with Starter (1 per billing cycle) and Pro (2 per billing cycle). Upgrade to unlock it.'}
      </p>
      <Link
        href="/pricing"
        className="mt-6 inline-flex h-10 items-center rounded-[var(--ie-radius-md)] px-4 text-sm font-semibold text-white"
        style={{ background: 'var(--accent-primary)' }}
      >
        {isPaidButInactive ? 'Renew plan' : 'View plans'}
      </Link>
    </section>
  );
}

export function ResumeReviewClient({
  initialQuota,
  initialRequests,
  resumes,
}: {
  initialQuota: ResumeReviewQuota | null;
  initialRequests: ResumeReviewRequestView[];
  resumes: ResumeOption[];
}) {
  const [quota, setQuota] = useState(initialQuota);
  const [requests, setRequests] = useState(initialRequests);
  const [resumeId, setResumeId] = useState<string>(
    resumes.find((r) => r.isPrimary)?.id ?? resumes[0]?.id ?? '',
  );
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const header = (
    <DashboardPageHeader
      eyebrow="Starter / Pro perk"
      title="Resume review session"
      subtitle="Request a human review of your resume from the InterviewEra team."
      backHref="/dashboard"
      backLabel="Dashboard"
    />
  );

  if (!quota || !quota.eligible) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {header}
        <UpsellCard planActive={quota?.planActive ?? false} planTier={quota?.planTier ?? 'free'} />
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    try {
      const res = await fetch('/api/resume-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resumeId: resumeId || null, notes: notes.trim() || undefined }),
      });
      const json = (await res.json().catch(() => null)) as
        | { request?: ResumeReviewRequestView; error?: string }
        | null;
      if (!res.ok || !json?.request) {
        throw new Error(json?.error ?? 'Could not submit your request.');
      }
      setRequests((prev) => [json.request!, ...prev]);
      setQuota((prev) => (prev ? { ...prev, used: prev.used + 1, remaining: Math.max(0, prev.remaining - 1) } : prev));
      setNotes('');
      toast.success('Resume review requested — we’ll reach out to schedule it.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit your request.');
    } finally {
      setBusy(false);
    }
  }

  const remaining = quota.remaining;
  const planLabel = quota.planTier === 'pro' ? 'Pro' : 'Starter';

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {header}

      <section className="dashboard-premium-card px-6 py-5 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {planLabel} plan · {quota.allowance} session{quota.allowance === 1 ? '' : 's'} per billing cycle
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1 text-xs font-bold"
            style={{
              background:
                remaining > 0
                  ? 'color-mix(in srgb, var(--accent-success) 16%, transparent)'
                  : 'color-mix(in srgb, var(--accent-danger) 14%, transparent)',
              color: remaining > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
            }}
          >
            {remaining} of {quota.allowance} remaining
          </span>
        </div>
      </section>

      <section className="dashboard-premium-card space-y-4 px-6 py-5 sm:px-7">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Request a session
        </h2>
        {remaining <= 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            You&apos;ve used all your resume review requests for this billing cycle. A new allowance
            opens up on your next renewal.
          </p>
        ) : (
          <>
            {resumes.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="resume-review-resume">Resume (optional)</Label>
                <select
                  id="resume-review-resume"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
                >
                  <option value="">No resume on file — I&apos;ll share it separately</option>
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {resumeLabel(r.id, resumes)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                No resume on file yet — you can still request a session and share it when we reach out.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="resume-review-notes">What would you like feedback on? (optional)</Label>
              <Textarea
                id="resume-review-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="e.g. Targeting backend SDE roles, want help tightening the experience section."
              />
            </div>
            <Button className="min-h-11" disabled={busy} onClick={() => void submit()}>
              {busy ? 'Submitting…' : 'Request resume review'}
            </Button>
          </>
        )}
      </section>

      {requests.length > 0 ? (
        <section className="dashboard-premium-card space-y-3 px-6 py-5 sm:px-7">
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Your requests
          </h2>
          <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
            {requests.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-3">
                <StatusIcon status={r.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatDateTimeEnIn(r.createdAt)}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {resumeLabel(r.resumeId, resumes)}
                  </p>
                  {r.notes ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {r.notes}
                    </p>
                  ) : null}
                  {r.scheduledAt ? (
                    <p className="mt-1 text-xs font-medium" style={{ color: 'var(--accent-primary)' }}>
                      Scheduled: {formatDateTimeEnIn(r.scheduledAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatusIcon({ status }: { status: ResumeReviewRequestView['status'] }) {
  const style = { color: STATUS_COPY[status].color };
  if (status === 'completed') return <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={style} aria-hidden />;
  if (status === 'cancelled') return <XCircle className="mt-0.5 size-4 shrink-0" style={style} aria-hidden />;
  if (status === 'scheduled') return <FileSearch className="mt-0.5 size-4 shrink-0" style={style} aria-hidden />;
  return <Clock className="mt-0.5 size-4 shrink-0" style={style} aria-hidden />;
}
