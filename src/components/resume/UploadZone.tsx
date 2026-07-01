'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import {
  IE_FIELD_SURFACE_STYLE,
  IE_SPINNER_LG_CLASS,
  IE_SURFACE_CLASS,
  IE_UPLOAD_ICON_SHELL_CLASS,
  IE_UPLOAD_ICON_SHELL_STYLE,
  IE_UPLOAD_ZONE_CLASS,
  IE_UPLOAD_ZONE_DRAG_STYLE,
  IE_UPLOAD_ZONE_IDLE_STYLE,
} from '@/lib/theme/component-classes';
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json';
import { formatResumeUserFacingError } from '@/lib/resume/parse-outcome';
import type { ParsedResume } from '@/types/app.types';
import { trackResumeUploadedGa4 } from '@/lib/analytics/funnel-ga4-bridge';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { cn } from '@/lib/utils';

type UploadStatus = 'idle' | 'uploading' | 'extracting' | 'parsing' | 'success' | 'error';

interface ParsedSummary {
  targetRole: string;
  skills: string[];
  experienceEstimate: string;
}

interface UploadZoneProps {
  initialResume?: ParsedResume | null;
}

interface UploadErrorResponse {
  error?: string;
  userMessage?: string;
  suggestion?: string;
  code?: 'PARSER_UNAVAILABLE' | 'SCANNED_NO_TEXT' | string;
}

const STATUS_LABEL: Record<string, string> = {
  uploading: 'Uploading file...',
  extracting: 'Extracting text...',
  parsing: 'AI is analyzing your resume...',
};

export function UploadZone({ initialResume }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>(
    initialResume ? 'success' : 'idle'
  );
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(() => {
    if (!initialResume) return null;
    const p = coerceParsedResume(initialResume);
    return {
      targetRole: p.target_role,
      skills: p.skills.slice(0, 8),
      experienceEstimate: p.experience_estimate,
    };
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(
    async (file: File) => {
      setStatus('uploading');
      setErrorMessage(null);

      let resolved = false;
      const t1 = setTimeout(() => {
        if (!resolved) setStatus('extracting');
      }, 2000);
      const t2 = setTimeout(() => {
        if (!resolved) setStatus('parsing');
      }, 4500);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/resume/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        resolved = true;
        clearTimeout(t1);
        clearTimeout(t2);

        if (!res.ok) {
          const data = await parseResponseJsonSafe<UploadErrorResponse>(res);
          setStatus('error');
          if (data.code === 'PARSER_UNAVAILABLE') {
            setErrorMessage(
              formatResumeUserFacingError(data) ||
                'Resume parser is temporarily unavailable. Your file is fine — retry in a minute.',
            );
          } else {
            setErrorMessage(formatResumeUserFacingError(data));
          }
          return;
        }

        const data = await parseResponseJsonSafe<{
          parsedSummary: ParsedSummary | null;
          parsed: boolean;
          resumeId?: string;
        }>(res);
        if (data.resumeId) {
          trackResumeUploadedGa4(data.resumeId, { source: 'upload_zone' });
        }
        if (data.parsedSummary) {
          setParsedSummary(data.parsedSummary);
        }
        setStatus('success');
        router.refresh();
      } catch {
        resolved = true;
        clearTimeout(t1);
        clearTimeout(t2);
        setStatus('error');
        setErrorMessage('Network error. Check your connection and try again.');
      }
    },
    [router]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const isUploading = status === 'uploading' || status === 'extracting' || status === 'parsing';

  if (status === 'success') {
    return (
      <div className={cn(IE_SURFACE_CLASS, 'p-5')} style={IE_FIELD_SURFACE_STYLE}>
        <div className="flex items-start justify-between gap-4">
          <div>
            {parsedSummary ? (
              <>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{parsedSummary.targetRole}</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Experience: {parsedSummary.experienceEstimate}
                </p>
                {parsedSummary.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parsedSummary.skills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full px-2 py-0.5 text-xs"
                        style={{
                          background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                    {parsedSummary.skills.length > 6 && (
                      <span className="self-center text-xs" style={{ color: 'var(--text-muted)' }}>
                        +{parsedSummary.skills.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Resume uploaded</p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  AI analysis is temporarily unavailable. Your resume was saved and will be analyzed when you start an interview.
                </p>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="min-h-11"
            onClick={() => {
              setStatus('idle');
              setParsedSummary(null);
            }}
          >
            Replace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          IE_UPLOAD_ZONE_CLASS,
          isUploading && 'pointer-events-none opacity-70',
        )}
        style={dragOver ? IE_UPLOAD_ZONE_DRAG_STYLE : IE_UPLOAD_ZONE_IDLE_STYLE}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className={IE_SPINNER_LG_CLASS} style={{ color: 'var(--accent-primary)' }} aria-hidden />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }} role="status" aria-live="polite">
              {STATUS_LABEL[status]}
            </p>
          </div>
        ) : (
          <>
            <div className={IE_UPLOAD_ICON_SHELL_CLASS} style={IE_UPLOAD_ICON_SHELL_STYLE}>
              <FileUp className="size-6 sm:size-7" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Drag & drop your resume (PDF or TXT, max 5 MB)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              className="mt-1 min-h-11"
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              Browse files
            </Button>
          </>
        )}
      </div>

      {status === 'error' && errorMessage && (
        <div className="mt-3 space-y-2">
          <AuthErrorBanner message={errorMessage} />
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="min-h-11"
              onClick={() => {
                setStatus('idle');
                setErrorMessage(null);
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
