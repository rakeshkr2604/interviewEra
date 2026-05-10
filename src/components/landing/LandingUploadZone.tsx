'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json';

interface LandingUploadZoneProps {
  isLoggedIn: boolean;
  /** Hide top microcopy when wrapped in hero pipeline demo */
  embeddedInHero?: boolean;
}

export function LandingUploadZone({ isLoggedIn, embeddedInHero }: LandingUploadZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion();
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
      router.push('/signup?next=/interview/new');
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

      router.push('/interview/new');
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
      <motion.div
        className={cn(
          'relative cursor-pointer rounded-2xl border-2 border-dashed px-6 py-10 text-center backdrop-blur-sm transition-colors sm:px-8 sm:py-12',
        )}
        style={{
          borderColor: isDragging ? 'var(--accent-primary)' : 'var(--card-border)',
          background: isDragging
            ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)'
            : 'color-mix(in srgb, var(--card-bg) 65%, transparent)',
          boxShadow: isDragging ? '0 0 0 3px color-mix(in srgb, var(--accent-primary) 20%, transparent)' : undefined,
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        whileHover={reduce ? undefined : { scale: 1.008 }}
        whileTap={reduce ? undefined : { scale: 0.995 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="sr-only"
          onChange={onInputChange}
        />

        <div className="flex flex-col items-center gap-3">
          <motion.div
            className="flex size-14 items-center justify-center rounded-2xl shadow-sm"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 15%, transparent)',
              color: 'var(--accent-primary)',
            }}
            animate={reduce || isDragging ? undefined : { y: [0, -4, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FileUp className="size-7" strokeWidth={1.5} />
          </motion.div>
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
      </motion.div>

      {error && (
        <p className="text-center text-sm" style={{ color: 'var(--accent-danger)' }} role="alert">
          {error}
        </p>
      )}

      <Button
        className="landing-cta-lift h-12 w-full rounded-xl border-0 bg-indigo-600 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:bg-indigo-700 hover:shadow-indigo-500/40 disabled:opacity-60"
        size="lg"
        disabled={uploading}
        onClick={() => {
          if (fileName) return;
          inputRef.current?.click();
        }}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Uploading…
          </>
        ) : isLoggedIn ? (
          'Upload resume & start interview →'
        ) : (
          'Upload resume → get your first interview free'
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Free tier · No credit card · Six tailored questions on your first session
      </p>
    </div>
  );
}
