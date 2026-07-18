'use client';

import { useCallback, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateEnIn } from '@/lib/datetime/ist';
import type { WorkspaceResumeItem } from './types';

type VersionListItem = {
  id: string;
  versionNumber: number;
  source: string;
  parserVersion: string | null;
  createdAt: string;
  isCurrent: boolean;
};

function sourceLabel(source: string): string {
  if (source === 'user_correction') return 'edited';
  if (source === 'backfill') return 'imported';
  return 'uploaded';
}

export function ResumeHistoryList({
  resumes,
  onSetPrimary,
  onDelete,
  busyId,
}: {
  resumes: WorkspaceResumeItem[];
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  busyId: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [versionsByResume, setVersionsByResume] = useState<Record<string, VersionListItem[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<string | null>(null);

  const toggleHistory = useCallback(
    async (resumeId: string) => {
      if (expandedId === resumeId) {
        setExpandedId(null);
        return;
      }
      setExpandedId(resumeId);
      if (versionsByResume[resumeId]) return;
      setLoadingVersions(resumeId);
      try {
        const res = await fetch(`/api/resume/${resumeId}/versions`, { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          versions?: Array<{
            id: string;
            versionNumber: number;
            source: string;
            parserVersion: string | null;
            createdAt: string;
            isCurrent: boolean;
          }>;
        };
        setVersionsByResume((prev) => ({
          ...prev,
          [resumeId]: data.versions ?? [],
        }));
      } finally {
        setLoadingVersions(null);
      }
    },
    [expandedId, versionsByResume],
  );

  if (resumes.length === 0) {
    return (
      <div
        className="dashboard-premium-card px-5 py-8 text-center text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        No other resumes — your primary is the only one on file.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {resumes.map((resume) => {
        const role = resume.parsed?.target_role || 'Resume';
        const version = resume.currentVersion;
        const expanded = expandedId === resume.id;
        return (
          <li key={resume.id} className="dashboard-premium-card px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <FileText
                  size={18}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                  style={{ color: 'var(--text-muted)' }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {role}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDateEnIn(resume.createdAt)}
                    {version
                      ? ` · v${version.versionNumber} · ${sourceLabel(version.source)}`
                      : ''}
                    {resume.lifecycleStatus === 'review_ready' ? ' · needs review' : ''}
                  </p>
                  {resume.parsed?.skills?.length ? (
                    <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {resume.parsed.skills.slice(0, 4).join(', ')}
                      {resume.parsed.skills.length > 4 ? '…' : ''}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  disabled={busyId === resume.id || resume.status !== 'parsed'}
                  onClick={() => onSetPrimary(resume.id)}
                >
                  {busyId === resume.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <>
                      <Star size={14} className="mr-1" aria-hidden />
                      Set as primary
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 min-w-11"
                  disabled={busyId === resume.id}
                  onClick={() => onDelete(resume.id)}
                  aria-label={`Delete resume ${role}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>

            <button
              type="button"
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}
              onClick={() => void toggleHistory(resume.id)}
              aria-expanded={expanded}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Version history
            </button>

            {expanded ? (
              <div className="mt-2 border-t pt-2" style={{ borderColor: 'var(--border-subtle, #e5e7eb)' }}>
                {loadingVersions === resume.id ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Loading versions…
                  </p>
                ) : (versionsByResume[resume.id]?.length ?? 0) === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    No version history yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {(versionsByResume[resume.id] ?? []).map((v) => (
                      <li
                        key={v.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span>
                          v{v.versionNumber} · {sourceLabel(v.source)}
                          {v.isCurrent ? ' · current' : ''}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {formatDateEnIn(v.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
