'use client';

import { useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { ParsedResume } from '@/types/app.types';

type UploadStatus = 'idle' | 'uploading' | 'extracting' | 'parsing' | 'success' | 'error';

interface ParsedSummary {
  name: string;
  skills: string[];
  targetRoles: string[];
}

interface UploadZoneProps {
  initialResume?: ParsedResume | null;
}

interface UploadErrorResponse {
  error?: string;
  code?: 'PARSER_UNAVAILABLE' | string;
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
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(
    initialResume
      ? {
          name: initialResume.name,
          skills: initialResume.skills.slice(0, 10),
          targetRoles: initialResume.target_roles,
        }
      : null
  );
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
          const data = (await res.json()) as UploadErrorResponse;
          setStatus('error');
          if (data.code === 'PARSER_UNAVAILABLE') {
            setErrorMessage(
              data.error ??
                'Resume parser is temporarily unavailable. Your file is fine - retry in a minute.'
            );
          } else {
            setErrorMessage(data.error ?? 'Upload failed. Please try again.');
          }
          return;
        }

        const data = (await res.json()) as { parsedSummary: ParsedSummary | null; parsed: boolean };
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
    // Reset input so the same file can be re-selected after an error
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
      <div className="rounded-lg border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            {parsedSummary ? (
              <>
                <p className="font-semibold">{parsedSummary.name}</p>
                {parsedSummary.targetRoles.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Target: {parsedSummary.targetRoles.join(', ')}
                  </p>
                )}
                {parsedSummary.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parsedSummary.skills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                    {parsedSummary.skills.length > 6 && (
                      <span className="self-center text-xs text-muted-foreground">
                        +{parsedSummary.skills.length - 6} more
                      </span>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">Resume uploaded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI analysis is temporarily unavailable. Your resume was saved and will be analyzed when you start an interview.
                </p>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            type="button"
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
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        } ${isUploading ? 'opacity-60' : ''}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {STATUS_LABEL[status]}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Drag & drop your resume (PDF or TXT, max 5 MB)
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Button
              variant="outline"
              className="mt-4"
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
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => {
              setStatus('idle');
              setErrorMessage(null);
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
