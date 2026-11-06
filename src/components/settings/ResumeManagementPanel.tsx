'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTimeEnIn } from '@/lib/datetime/ist';
import type { ResumeSnapshot } from '@/lib/candidate/types';

const RESUME_ACCEPT = '.pdf,.txt';
/** Matches the interview-start upload flow's poll budget (~30s). */
const PARSE_POLL_ATTEMPTS = 20;
const PARSE_POLL_INTERVAL_MS = 1_500;

type Phase = 'idle' | 'uploading' | 'parsing' | 'error';

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function ResumeManagementPanel({ initial }: { initial: ResumeSnapshot | null }) {
  const [resume, setResume] = useState(initial);
  const [fileName, setFileName] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setPhase('uploading');
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/resume/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const uploadJson = (await uploadRes.json().catch(() => null)) as
        | { resumeId?: string; error?: string }
        | null;
      if (!uploadRes.ok || !uploadJson?.resumeId) {
        throw new Error(uploadJson?.error ?? 'Could not upload your resume.');
      }
      const resumeId = uploadJson.resumeId;
      setFileName(file.name);
      setPhase('parsing');

      const parseRes = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resumeId }),
      });
      if (!parseRes.ok) throw new Error('Could not process your resume.');

      let parsed = false;
      for (let i = 0; i < PARSE_POLL_ATTEMPTS; i++) {
        await sleep(PARSE_POLL_INTERVAL_MS);
        const statusRes = await fetch(`/api/resume/status?id=${resumeId}`, { credentials: 'include' });
        if (!statusRes.ok) continue;
        const status = (await statusRes.json()) as { status?: string };
        if (status.status === 'parsed') {
          parsed = true;
          break;
        }
        if (status.status === 'failed') {
          throw new Error('Resume processing failed. Try a different file.');
        }
      }
      if (!parsed) throw new Error('Resume processing timed out. Please retry.');

      // Make this the active resume for interviews and resume review sessions.
      const primaryRes = await fetch(`/api/resume/${resumeId}/primary`, { method: 'POST' });
      if (!primaryRes.ok) {
        throw new Error('Resume uploaded, but could not set it as your active resume. Try again.');
      }

      setResume({
        id: resumeId,
        status: 'parsed',
        createdAt: new Date().toISOString(),
        fileUrl: null,
        parsed: null,
        parseQuality: null,
        parseWarning: null,
      });
      setPhase('idle');
    } catch (uploadError) {
      setPhase('error');
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload your resume.');
    }
  }

  const busy = phase === 'uploading' || phase === 'parsing';

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept={RESUME_ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void handleUpload(file);
        }}
      />

      {resume ? (
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-success) 40%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
          }}
        >
          <CheckCircle2 className="size-5 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {fileName ?? 'Resume on file'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Uploaded {formatDateTimeEnIn(resume.createdAt)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="shrink-0"
          >
            {busy ? 'Uploading…' : 'Replace'}
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center transition-colors disabled:opacity-60"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent-primary)' }} aria-hidden />
          ) : (
            <Upload className="size-6" style={{ color: 'var(--text-muted)' }} aria-hidden />
          )}
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {phase === 'uploading'
              ? 'Uploading…'
              : phase === 'parsing'
                ? 'Processing your resume…'
                : 'Upload your resume (PDF or TXT)'}
          </span>
          {!busy ? (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <FileText className="size-3.5" aria-hidden /> No resume on file yet
            </span>
          ) : null}
        </button>
      )}

      {error ? (
        <p className="text-xs" role="alert" style={{ color: 'var(--accent-danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
