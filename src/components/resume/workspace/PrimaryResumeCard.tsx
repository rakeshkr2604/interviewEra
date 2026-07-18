'use client';

import { CheckCircle2, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateEnIn } from '@/lib/datetime/ist';
import type { WorkspaceResumeItem } from './types';

const LIFECYCLE_LABEL: Record<string, string> = {
  uploaded: 'Uploaded',
  parsing: 'Parsing',
  parse_failed: 'Parse failed',
  review_ready: 'Ready to review',
  verified: 'Verified',
  deleted: 'Deleted',
};

export function PrimaryResumeCard({
  resume,
  onReplace,
  onReview,
  replaceBusy,
}: {
  resume: WorkspaceResumeItem;
  onReplace: () => void;
  onReview: () => void;
  replaceBusy?: boolean;
}) {
  const role = resume.parsed?.target_role || 'Your resume';
  const exp = resume.parsed?.experience_estimate || 'Experience not set';
  const skills = resume.parsed?.skills.slice(0, 8) ?? [];
  const version = resume.currentVersion;
  const versionMarker = version
    ? `v${version.versionNumber} · ${
        version.source === 'user_correction' ? 'edited by you' : 'uploaded'
      }`
    : null;
  const lifecycle = resume.lifecycleStatus
    ? LIFECYCLE_LABEL[resume.lifecycleStatus] ?? resume.lifecycleStatus
    : resume.status;

  return (
    <section
      className="dashboard-premium-card px-5 py-5 sm:px-7"
      aria-labelledby="primary-resume-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                color: 'var(--accent-primary)',
              }}
            >
              <Sparkles size={12} aria-hidden />
              Primary
            </span>
            {versionMarker ? (
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                {versionMarker}
              </span>
            ) : null}
          </div>
          <h2
            id="primary-resume-heading"
            className="mt-2 text-lg font-semibold tracking-tight sm:text-xl"
            style={{ color: 'var(--text-primary)' }}
          >
            {role}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {exp}
            <span className="mx-1.5 opacity-40">·</span>
            {formatDateEnIn(resume.createdAt)}
            <span className="mx-1.5 opacity-40">·</span>
            {lifecycle}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            disabled={replaceBusy}
            onClick={onReplace}
          >
            <RefreshCw size={14} className="mr-1.5" aria-hidden />
            Replace
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            onClick={onReview}
            disabled={!resume.parsed || !resume.currentVersionId}
          >
            {resume.lifecycleStatus === 'review_ready' ? (
              <>
                <Pencil size={14} className="mr-1.5" aria-hidden />
                Review extracted details
              </>
            ) : (
              <>
                <CheckCircle2 size={14} className="mr-1.5" aria-hidden />
                Review details
              </>
            )}
          </Button>
        </div>
      </div>

      {skills.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                color: 'var(--text-primary)',
              }}
            >
              {skill}
            </span>
          ))}
          {(resume.parsed?.skills.length ?? 0) > 8 ? (
            <span className="self-center text-xs" style={{ color: 'var(--text-muted)' }}>
              +{(resume.parsed?.skills.length ?? 0) - 8} more
            </span>
          ) : null}
        </div>
      ) : null}

      <p
        className="mt-4 flex items-center gap-1.5 text-xs sm:text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        <Sparkles size={14} aria-hidden style={{ color: 'var(--accent-primary)' }} />
        Powers your mock interviews — questions and feedback use this resume.
      </p>
    </section>
  );
}
