'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import { PrimaryResumeCard } from '@/components/resume/workspace/PrimaryResumeCard';
import { ResumeUploadPanel } from '@/components/resume/workspace/ResumeUploadPanel';
import { ResumeReviewPanel } from '@/components/resume/workspace/ResumeReviewPanel';
import { ResumeHistoryList } from '@/components/resume/workspace/ResumeHistoryList';
import { trackResumeDeletedClient } from '@/lib/analytics/resume-analytics-client';
import type {
  VersionDetail,
  WorkspaceResumeItem,
} from '@/components/resume/workspace/types';

/** @deprecated kept for page.tsx type re-export compat during rebuild */
export type ResumeListItem = {
  id: string;
  status: WorkspaceResumeItem['status'];
  createdAt: string;
  parsed: WorkspaceResumeItem['parsed'];
  parseQuality: string | null;
  parseWarning: string | null;
};

export type { WorkspaceResumeItem };

type ReviewTarget = {
  resumeId: string;
  version: VersionDetail;
};

export function ResumeWorkspaceClient({
  resumes: initialResumes,
  userId,
}: {
  resumes: WorkspaceResumeItem[];
  /** @deprecated unused — kept so older call sites typecheck during migrate */
  latestParsed?: WorkspaceResumeItem['parsed'];
  userId: string;
}) {
  const router = useRouter();
  const [resumes, setResumes] = useState(initialResumes);
  const [showReplaceUpload, setShowReplaceUpload] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [review, setReview] = useState<ReviewTarget | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versionBanner, setVersionBanner] = useState<string | null>(null);
  const attemptedParseRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  const primary = useMemo(
    () => resumes.find((r) => r.isPrimary) ?? resumes.find((r) => r.parsed) ?? null,
    [resumes],
  );
  const others = useMemo(
    () => resumes.filter((r) => r.id !== primary?.id),
    [resumes, primary?.id],
  );

  const refreshList = useCallback(async () => {
    try {
      const res = await fetch('/api/resume', { credentials: 'include' });
      if (!res.ok) {
        router.refresh();
        return;
      }
      const data = (await res.json()) as { resumes?: WorkspaceResumeItem[] };
      if (data.resumes) setResumes(data.resumes);
      else router.refresh();
    } catch {
      router.refresh();
    }
  }, [router]);

  // Recover stuck parsing rows (same discipline as before)
  useEffect(() => {
    const stuck = resumes.find((r) => r.status === 'parsing');
    if (!stuck || attemptedParseRef.current.has(stuck.id)) return;
    attemptedParseRef.current.add(stuck.id);
    void (async () => {
      try {
        const res = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            resumeId: stuck.id,
            uploadId: stuck.latestUploadId ?? undefined,
          }),
        });
        if (res.ok) await refreshList();
      } catch {
        /* user can re-upload */
      }
    })();
  }, [resumes, refreshList]);

  const openReview = useCallback(
    async (resume: WorkspaceResumeItem) => {
      if (!resume.currentVersionId) {
        setError('No version available to review yet.');
        return;
      }
      setReviewLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/resume/${resume.id}/versions/${resume.currentVersionId}`,
          { credentials: 'include' },
        );
        if (!res.ok) {
          setError('Could not load version for review.');
          return;
        }
        const data = (await res.json()) as { version: VersionDetail };
        setReview({ resumeId: resume.id, version: data.version });
        setShowReplaceUpload(false);
      } catch {
        setError('Network error loading review.');
      } finally {
        setReviewLoading(false);
      }
    },
    [],
  );

  const handleUploadSuccess = useCallback(
    async (payload: { resumeId: string; versionId?: string }) => {
      setShowReplaceUpload(false);
      await refreshList();
      // Open review for the uploaded resume
      const res = await fetch(`/api/resume/${payload.resumeId}/versions`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = (await res.json()) as {
          currentVersionId?: string;
          versions?: Array<{ id: string }>;
        };
        const versionId =
          payload.versionId ?? data.currentVersionId ?? data.versions?.[0]?.id;
        if (versionId) {
          const detailRes = await fetch(
            `/api/resume/${payload.resumeId}/versions/${versionId}`,
            { credentials: 'include' },
          );
          if (detailRes.ok) {
            const detail = (await detailRes.json()) as { version: VersionDetail };
            setReview({ resumeId: payload.resumeId, version: detail.version });
            return;
          }
        }
      }
      // Fallback: refresh and try primary
      router.refresh();
    },
    [refreshList, router],
  );

  const handleConfirmed = useCallback(
    async (result: { versionNumber: number; skipped: boolean }) => {
      setReview(null);
      setVersionBanner(
        result.skipped
          ? `Resume verified · v${result.versionNumber}`
          : `v${result.versionNumber} · edited by you — now verified`,
      );
      await refreshList();
      router.refresh();
    },
    [refreshList, router],
  );

  const handleSetPrimary = useCallback(
    async (resumeId: string) => {
      setBusyId(resumeId);
      setError(null);
      try {
        const res = await fetch(`/api/resume/${resumeId}/primary`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(data?.error ?? 'Could not set primary resume.');
          return;
        }
        await refreshList();
      } catch {
        setError('Network error while setting primary.');
      } finally {
        setBusyId(null);
      }
    },
    [refreshList],
  );

  const handleDelete = useCallback(
    async (resumeId: string) => {
      const ok = window.confirm(
        'Delete this resume?\n\n' +
          'In-progress interviews that use it will block deletion. ' +
          'Completed interviews keep a frozen snapshot — their reports will not change.\n\n' +
          'This hides the resume from your workspace (soft delete).',
      );
      if (!ok) return;
      setBusyId(resumeId);
      setError(null);
      try {
        const res = await fetch(`/api/resume/${resumeId}/delete`, { method: 'DELETE' });
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
        await refreshList();
      } catch {
        setError('Network error while deleting resume.');
      } finally {
        setBusyId(null);
      }
    },
    [refreshList, userId],
  );

  // Empty state — first visit
  if (resumes.length === 0 && !review) {
    return (
      <div className="space-y-6">
        <section className="dashboard-premium-card px-5 py-8 text-center sm:px-8">
          <Upload
            className="mx-auto mb-3 opacity-70"
            size={28}
            aria-hidden
            style={{ color: 'var(--accent-primary)' }}
          />
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            Add the resume that powers your interviews
          </h2>
          <p
            className="mx-auto mt-2 max-w-md text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            InterviewEra personalizes questions from your role, skills, and experience. Upload
            once, review the extract, and every mock interview starts from that profile.
          </p>
        </section>
        <ResumeUploadPanel
          onSuccess={(p) => void handleUploadSuccess(p)}
          onBusyChange={setUploadBusy}
          compactEmpty
          title="Upload your first resume"
          subtitle="PDF or TXT · max 4 MB · ≤10 pages"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {versionBanner ? (
        <p
          className="rounded-lg px-4 py-2.5 text-sm font-medium"
          role="status"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--text-primary)',
          }}
        >
          {versionBanner}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>
          {error}
        </p>
      ) : null}

      {review ? (
        <ResumeReviewPanel
          resumeId={review.resumeId}
          version={review.version}
          onConfirmed={(r) => void handleConfirmed(r)}
          onCancel={() => setReview(null)}
        />
      ) : null}

      {!review && primary ? (
        <PrimaryResumeCard
          resume={primary}
          replaceBusy={uploadBusy}
          onReplace={() => {
            setShowReplaceUpload(true);
            setVersionBanner(null);
          }}
          onReview={() => void openReview(primary)}
        />
      ) : null}

      {reviewLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading review…
        </p>
      ) : null}

      {showReplaceUpload && primary && !review ? (
        <ResumeUploadPanel
          targetResumeId={primary.id}
          onSuccess={(p) => void handleUploadSuccess(p)}
          onBusyChange={setUploadBusy}
          title="Replace primary resume"
          subtitle="Uploads a new version on your primary resume — older versions stay in history."
        />
      ) : null}

      {!review ? (
        <section aria-labelledby="resume-history-heading">
          <h2 id="resume-history-heading" className="dashboard-section-title mb-3">
            Other resumes
          </h2>
          <p className="dashboard-section-subtitle mb-3">
            Older uploads appear as separate cards. Expand version history inside a card — not a
            flat pile of duplicates.
          </p>
          <ResumeHistoryList
            resumes={others}
            onSetPrimary={(id) => void handleSetPrimary(id)}
            onDelete={(id) => void handleDelete(id)}
            busyId={busyId}
          />
        </section>
      ) : null}
    </div>
  );
}
