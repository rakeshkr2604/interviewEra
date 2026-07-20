'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FileUp } from 'lucide-react';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import { AuthErrorBanner } from '@/components/auth/AuthErrorBanner';
import {
  IE_UPLOAD_ICON_SHELL_CLASS,
  IE_UPLOAD_ICON_SHELL_STYLE,
  IE_UPLOAD_ZONE_CLASS,
  IE_UPLOAD_ZONE_DRAG_STYLE,
  IE_UPLOAD_ZONE_IDLE_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';
import { trackResumeUploadedGa4 } from '@/lib/analytics/funnel-ga4-bridge';
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';

interface LandingUploadZoneProps {
  isLoggedIn: boolean;
  /** Hide top microcopy when wrapped in hero pipeline demo */
  embeddedInHero?: boolean;
}

export function LandingUploadZone({ isLoggedIn, embeddedInHero }: LandingUploadZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ACCEPTED = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  function validateFile(file: File): string | null {
    if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(pdf|docx?|txt)$/i)) {
      return 'Please upload a PDF, DOCX, or TXT file.';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'File size must be under 5 MB.';
    }
    return null;
  }

  async function handleFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFileName(file.name);

    if (!isLoggedIn) {
      router.push(`/signup?next=${encodeURIComponent(getDefaultInterviewStartPath())}`);
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await parseResponseJsonSafe<{ error?: string }>(res);
        setError(data.error ?? 'Upload failed. Please try again.');
        return;
      }

      const data = await parseResponseJsonSafe<{ resumeId?: string }>(res);
      if (data.resumeId) {
        trackResumeUploadedGa4(data.resumeId, { source: 'landing_upload_zone' });
      }

      router.push(getDefaultInterviewStartPath());
    } catch {
      setError('Upload failed. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="space-y-4">
      {!embeddedInHero && (
        <p
          className="flex items-center justify-center gap-2 text-center text-xs font-medium sm:justify-start"
          style={{ color: 'var(--text-muted)' }}
        >
          <span
            className="inline-flex size-1.5 animate-pulse rounded-full"
            style={{ background: 'var(--accent-success)' }}
            aria-hidden
          />
          Takes less than 60 seconds · no manual typing
        </p>
      )}
      <div
        className={cn(
          IE_UPLOAD_ZONE_CLASS,
          'relative cursor-pointer backdrop-blur-sm',
          isDragging && 'ring-0',
        )}
        style={
          isDragging
            ? {
                ...IE_UPLOAD_ZONE_DRAG_STYLE,
                borderColor: 'var(--accent-primary)',
                background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              }
            : {
                ...IE_UPLOAD_ZONE_IDLE_STYLE,
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 65%, transparent)',
              }
        }
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="sr-only"
          onChange={onInputChange}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={IE_UPLOAD_ICON_SHELL_CLASS}
            style={IE_UPLOAD_ICON_SHELL_STYLE}
          >
            <FileUp className="size-7" strokeWidth={1.5} aria-hidden />
          </div>
          {fileName ? (
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {fileName}
            </p>
          ) : (
            <>
              <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {isDragging ? 'Drop to upload' : 'Drag & drop your resume'}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                PDF, DOCX, or TXT · max 5 MB
              </p>
            </>
          )}
        </div>
      </div>

      {error ? <AuthErrorBanner message={error} className="text-center" /> : null}

      <FormSubmitButton
        type="button"
        loading={uploading}
        loadingLabel="Uploading…"
        disabled={uploading}
        onClick={() => {
          if (fileName) return;
          inputRef.current?.click();
        }}
      >
        {isLoggedIn ? 'Upload resume & start interview →' : 'Upload resume → get your first interview free'}
      </FormSubmitButton>

      <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Free tier · No credit card · Six tailored questions on your first session
      </p>
    </div>
  );
}
