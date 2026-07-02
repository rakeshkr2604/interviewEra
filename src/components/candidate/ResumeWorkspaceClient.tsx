'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/resume/UploadZone';
import { formatDateEnIn } from '@/lib/datetime/ist';
import type { ParsedResume, ResumeStatus } from '@/types/app.types';
import { trackResumeDeletedClient } from '@/lib/analytics/resume-analytics-client';

export interface ResumeListItem {
  id: string;
  status: ResumeStatus;
  createdAt: string;
  parsed: ParsedResume | null;
  parseQuality: string | null;
  parseWarning: string | null;
}

const STATUS_LABEL: Record<ResumeStatus, string> = {
  uploading: 'Uploading',
  parsing: 'Parsing',
  parsed: 'Ready',
  failed: 'Failed',
};

export function ResumeWorkspaceClient({
  resumes,
  latestParsed,
  userId,
}: {
  resumes: ResumeListItem[];
  latestParsed: ParsedResume | null;
  userId: string;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryingParseId, setRetryingParseId] = useState<string | null>(null);
  const attemptedParseRef = useRef<Set<string>>(new Set());

  // Recover resumes stuck in `parsing` when parse was never triggered (e.g. before this fix).
  useEffect(() => {
    const stuck = resumes.find((r) => r.status === 'parsing');
    if (!stuck || attemptedParseRef.current.has(stuck.id)) return;

    let cancelled = false;
    attemptedParseRef.current.add(stuck.id);
    setRetryingParseId(stuck.id);

    void (async () => {
      try {
        const res = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ resumeId: stuck.id }),
        });
        if (!cancelled && res.ok) {
          router.refresh();
        }
      } catch {
        // User can re-upload or refresh; avoid noisy errors for background recovery.
      } finally {
        if (!cancelled) setRetryingParseId(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumes, router]);

  const handleDelete = useCallback(
    async (resumeId: string) => {
      if (!window.confirm('Delete this resume? This cannot be undone.')) return;
      setDeletingId(resumeId);
      setError(null);
      try {
        const res = await fetch(`/api/resume/${resumeId}`, { method: 'DELETE' });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? 'Could not delete resume.');
          return;
        }
        trackResumeDeletedClient({
          user_id: userId,
          resume_id: resumeId,
          source: 'resume_workspace',
        });
        router.refresh();
      } catch {
        setError('Network error while deleting resume.');
      } finally {
        setDeletingId(null);
      }
    },
    [router, userId],
  );

  return (
    <div className="space-y-6">
      <section className="dashboard-premium-card px-5 py-5 sm:px-7" aria-labelledby="resume-upload-heading">
        <h2 id="resume-upload-heading" className="dashboard-section-title">
          Upload or replace resume
        </h2>
        <p className="dashboard-section-subtitle mb-4">
          PDF or TXT — parsed skills and experience power mock interviews.
        </p>
        <UploadZone initialResume={latestParsed} />
      </section>

      {error ? (
        <p className="text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>
          {error}
        </p>
      ) : null}

      <section aria-labelledby="resume-history-heading">
        <h2 id="resume-history-heading" className="dashboard-section-title mb-3">
          Resume history
        </h2>
        {resumes.length === 0 ? (
          <div
            className="dashboard-premium-card px-5 py-8 text-center text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <Upload className="mx-auto mb-2 opacity-60" size={24} aria-hidden />
            No resumes yet — upload one to get started.
          </div>
        ) : (
          <ul className="space-y-3">
            {resumes.map((resume) => (
              <li key={resume.id} className="dashboard-premium-card px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText size={20} className="mt-0.5 shrink-0" aria-hidden style={{ color: 'var(--text-muted)' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {resume.parsed?.target_role || 'Resume'}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {formatDateEnIn(resume.createdAt)} ·{' '}
                        {retryingParseId === resume.id ? 'Analyzing…' : STATUS_LABEL[resume.status]}
                        {resume.parseQuality ? ` · ${resume.parseQuality} parse` : ''}
                      </p>
                      {resume.parseWarning ? (
                        <p className="mt-1 text-xs" style={{ color: 'var(--accent-warning)' }}>
                          {resume.parseWarning}
                        </p>
                      ) : null}
                      {resume.parsed && resume.parsed.skills.length > 0 ? (
                        <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Skills: {resume.parsed.skills.slice(0, 6).join(', ')}
                          {resume.parsed.skills.length > 6 ? '…' : ''}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 min-w-11"
                    disabled={deletingId === resume.id}
                    onClick={() => void handleDelete(resume.id)}
                    aria-label={`Delete resume from ${formatDateEnIn(resume.createdAt)}`}
                  >
                    {deletingId === resume.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="size-4" aria-hidden />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
