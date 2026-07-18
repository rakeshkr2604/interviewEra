'use client';

import { useCallback, useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import {
  IE_SPINNER_LG_CLASS,
  IE_UPLOAD_ICON_SHELL_CLASS,
  IE_UPLOAD_ICON_SHELL_STYLE,
  IE_UPLOAD_ZONE_CLASS,
  IE_UPLOAD_ZONE_DRAG_STYLE,
  IE_UPLOAD_ZONE_IDLE_STYLE,
} from '@/lib/theme/component-classes';
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json';
import { formatResumeUserFacingError } from '@/lib/resume/parse-outcome';
import { trackResumeUploadedGa4 } from '@/lib/analytics/funnel-ga4-bridge';
import { cn } from '@/lib/utils';
import type { UploadErrorKind, UploadPhase } from './types';

/** Matches server MULTIPART_UPLOAD_MAX_BYTES (Vercel body cap). */
const MAX_BYTES = 4 * 1024 * 1024;

const PHASE_LABEL: Record<string, string> = {
  uploading: 'Uploading file…',
  extracting: 'Reading your resume text…',
  parsing: 'AI is extracting role, skills, and experience…',
};

function classifyErrorCode(code: string | undefined): UploadErrorKind {
  switch (code) {
    case 'UNSUPPORTED_EXT':
    case 'UNSUPPORTED':
    case 'WRONG_DOCUMENT_TYPE':
      return 'wrong_type';
    case 'FILE_TOO_LARGE':
    case 'BODY_TOO_LARGE':
      return 'too_large';
    case 'TOO_MANY_PAGES':
      return 'too_many_pages';
    case 'SCANNED_NO_TEXT':
    case 'GARBAGE_CONTENT':
    case 'NO_RAW_TEXT':
      return 'unreadable';
    case 'PARSE_TIMEOUT':
      return 'timeout';
    default:
      return 'other';
  }
}

export type UploadSuccessPayload = {
  resumeId: string;
  uploadId: string;
  versionId?: string;
  versionNumber?: number;
  discarded?: boolean;
};

export function ResumeUploadPanel({
  /** When set, upload creates a new version on this resume (Replace). */
  targetResumeId,
  onSuccess,
  onBusyChange,
  compactEmpty,
  title,
  subtitle,
}: {
  targetResumeId?: string | null;
  onSuccess: (payload: UploadSuccessPayload) => void;
  onBusyChange?: (busy: boolean) => void;
  compactEmpty?: boolean;
  title?: string;
  subtitle?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<UploadErrorKind | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Generation token — only the latest upload's result may update UI. */
  const generationRef = useRef(0);

  const resetError = useCallback(() => {
    setPhase('idle');
    setErrorMessage(null);
    setErrorKind(null);
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      const gen = ++generationRef.current;
      onBusyChange?.(true);
      setPhase('uploading');
      setErrorMessage(null);
      setErrorKind(null);

      if (file.size > MAX_BYTES) {
        if (gen !== generationRef.current) return;
        setPhase('error');
        setErrorKind('too_large');
        setErrorMessage(
          `File exceeds ${Math.floor(MAX_BYTES / (1024 * 1024))} MB limit. Export a smaller PDF or use .txt.`,
        );
        onBusyChange?.(false);
        return;
      }

      let resolved = false;
      const t1 = setTimeout(() => {
        if (!resolved && gen === generationRef.current) setPhase('extracting');
      }, 1800);
      const t2 = setTimeout(() => {
        if (!resolved && gen === generationRef.current) setPhase('parsing');
      }, 4000);

      try {
        const formData = new FormData();
        formData.append('file', file);
        if (targetResumeId) formData.append('resumeId', targetResumeId);

        const res = await fetch('/api/resume/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        resolved = true;
        clearTimeout(t1);
        clearTimeout(t2);

        if (gen !== generationRef.current) {
          // Superseded by a newer upload — ignore this response entirely.
          return;
        }

        if (!res.ok) {
          const data = await parseResponseJsonSafe<{
            error?: string;
            userMessage?: string;
            suggestion?: string;
            code?: string;
          }>(res);
          setPhase('error');
          setErrorKind(classifyErrorCode(data.code));
          setErrorMessage(formatResumeUserFacingError(data));
          onBusyChange?.(false);
          return;
        }

        const data = await parseResponseJsonSafe<{
          resumeId?: string;
          uploadId?: string;
        }>(res);

        if (!data.resumeId || !data.uploadId) {
          setPhase('error');
          setErrorKind('other');
          setErrorMessage('Upload succeeded but resume id is missing. Please retry.');
          onBusyChange?.(false);
          return;
        }

        trackResumeUploadedGa4(data.resumeId, { source: 'resume_workspace' });
        setPhase('parsing');

        const parseController = new AbortController();
        const parseTimeout = window.setTimeout(() => parseController.abort(), 65_000);
        try {
          const parseRes = await fetch('/api/resume/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ resumeId: data.resumeId, uploadId: data.uploadId }),
            signal: parseController.signal,
          });

          if (gen !== generationRef.current) return;

          if (!parseRes.ok) {
            const perr = await parseResponseJsonSafe<{
              error?: string;
              userMessage?: string;
              suggestion?: string;
              code?: string;
            }>(parseRes);
            setPhase('error');
            setErrorKind(classifyErrorCode(perr.code));
            setErrorMessage(
              formatResumeUserFacingError(perr) ||
                'We could not analyze this resume. Try a text-based PDF or a .txt export.',
            );
            onBusyChange?.(false);
            return;
          }

          const parsed = await parseResponseJsonSafe<{
            versionId?: string;
            versionNumber?: number;
            discarded?: boolean;
            status?: string;
          }>(parseRes);

          if (gen !== generationRef.current) return;

          if (parsed.discarded || parsed.status === 'superseded') {
            // Stale parse — a newer upload won; stay quiet, newer flow owns UI.
            return;
          }

          setPhase('review_ready');
          onBusyChange?.(false);
          onSuccess({
            resumeId: data.resumeId,
            uploadId: data.uploadId,
            versionId: parsed.versionId,
            versionNumber: parsed.versionNumber,
          });
        } catch (parseErr) {
          if (gen !== generationRef.current) return;
          const aborted =
            parseErr instanceof DOMException && parseErr.name === 'AbortError';
          setPhase('error');
          setErrorKind(aborted ? 'timeout' : 'other');
          setErrorMessage(
            aborted
              ? 'Resume analysis timed out. Please retry — shorter resumes parse faster.'
              : 'Could not start resume analysis. Check your connection and retry.',
          );
          onBusyChange?.(false);
        } finally {
          window.clearTimeout(parseTimeout);
        }
      } catch {
        resolved = true;
        clearTimeout(t1);
        clearTimeout(t2);
        if (gen !== generationRef.current) return;
        setPhase('error');
        setErrorKind('other');
        setErrorMessage('Network error. Check your connection and try again.');
        onBusyChange?.(false);
      }
    },
    [onBusyChange, onSuccess, targetResumeId],
  );

  const isBusy = phase === 'uploading' || phase === 'extracting' || phase === 'parsing';

  return (
    <section
      className="dashboard-premium-card px-5 py-5 sm:px-7"
      aria-labelledby="resume-upload-heading"
    >
      <h2 id="resume-upload-heading" className="dashboard-section-title">
        {title ?? (targetResumeId ? 'Replace primary resume' : 'Upload resume')}
      </h2>
      <p className="dashboard-section-subtitle mb-4">
        {subtitle ??
          'PDF or TXT · max 4 MB · up to 10 pages. A clear resume makes interview questions personal.'}
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        className={cn(IE_UPLOAD_ZONE_CLASS, isBusy && 'pointer-events-none opacity-70')}
        style={dragOver ? IE_UPLOAD_ZONE_DRAG_STYLE : IE_UPLOAD_ZONE_IDLE_STYLE}
      >
        {isBusy ? (
          <div className="flex flex-col items-center gap-3 px-2 text-center">
            <Loader2
              className={IE_SPINNER_LG_CLASS}
              style={{ color: 'var(--accent-primary)' }}
              aria-hidden
            />
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
              role="status"
              aria-live="polite"
            >
              {PHASE_LABEL[phase] ?? 'Working…'}
            </p>
            <p className="max-w-sm text-xs" style={{ color: 'var(--text-muted)' }}>
              If you upload again, only the latest file is kept — earlier parses are discarded.
            </p>
          </div>
        ) : (
          <>
            <div className={IE_UPLOAD_ICON_SHELL_CLASS} style={IE_UPLOAD_ICON_SHELL_STYLE}>
              <FileUp className="size-6 sm:size-7" strokeWidth={1.5} aria-hidden />
            </div>
            <label
              htmlFor="resume-workspace-upload"
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {compactEmpty
                ? 'Drop your resume to start personalizing interviews'
                : 'Drag & drop your resume here'}
            </label>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              PDF or TXT · max 4 MB · ≤10 pages
            </p>
            <input
              ref={inputRef}
              id="resume-workspace-upload"
              type="file"
              accept=".pdf,.txt"
              className="sr-only"
              aria-label="Upload resume file (PDF or TXT, max 4 MB, 10 pages)"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
                e.target.value = '';
              }}
              disabled={isBusy}
            />
            <Button
              variant="outline"
              className="mt-1 min-h-11"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              Browse files
            </Button>
          </>
        )}
      </div>

      {phase === 'error' && errorMessage ? (
        <div className="mt-3 space-y-2">
          <AuthErrorBanner message={errorMessage} />
          {errorKind ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {errorKind === 'wrong_type' && 'Tip: use a PDF or TXT resume, not a job description.'}
              {errorKind === 'too_large' && 'Tip: export a smaller PDF or paste into a .txt file.'}
              {errorKind === 'too_many_pages' && 'Tip: keep the resume to 10 pages or fewer.'}
              {errorKind === 'unreadable' &&
                'Tip: use a text-based PDF from Word/Google Docs, not a scan.'}
              {errorKind === 'timeout' && 'Tip: shorter resumes parse more reliably — retry once.'}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" type="button" className="min-h-11" onClick={resetError}>
              Try again
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
