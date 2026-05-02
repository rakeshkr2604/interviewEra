'use client';

import { useRef, useActionState, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Loader2, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { posthog } from '@/lib/analytics/posthog';
import { checkAtsAction } from './actions';
import { ATS_RESULT_STORAGE_KEY, serializeAtsResult } from './ats-result-storage';
import { AtsResultsView } from './AtsResultsView';
import { initialState } from './ats-types';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';

function setInputFile(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
}

export function AtsCheckerForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const redirectDoneRef = useRef(false);
  const [state, formAction, isPending] = useActionState(checkAtsAction, initialState);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [inlineFallback, setInlineFallback] = useState(false);

  useEffect(() => {
    if (!state.result || redirectDoneRef.current) return;
    redirectDoneRef.current = true;
    try {
      sessionStorage.setItem(ATS_RESULT_STORAGE_KEY, serializeAtsResult(state.result));
    } catch {
      redirectDoneRef.current = false;
      setInlineFallback(true);
      posthog.capture('tool_used', { toolName: 'ats-checker' });
      return;
    }
    posthog.capture('tool_used', { toolName: 'ats-checker' });
    router.replace('/tools/ats-checker/results');
  }, [state.result, router]);

  const syncLabelFromInput = useCallback(() => {
    const f = fileInputRef.current?.files?.[0];
    setFileLabel(f ? f.name : null);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (!file || !fileInputRef.current) return;
      const ok = /\.(pdf|txt)$/i.test(file.name) || file.type === 'application/pdf' || file.type === 'text/plain';
      if (!ok) return;
      setInputFile(fileInputRef.current, file);
      setFileLabel(file.name);
    },
    [],
  );

  return (
    <div className="space-y-8">
      <FreeToolFormCard
        headerEyebrow="Analyzer"
        headerTitle="Upload resume · optional job description · instant report"
      >
        <form action={formAction} className="space-y-6 p-5 sm:p-7 lg:p-8">
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              Resume <span style={{ color: 'var(--text-muted)' }}>(PDF or TXT · max 5 MB)</span>
            </label>
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-all sm:py-12',
                dragOver && 'scale-[1.01]',
              )}
              style={{
                borderColor: dragOver
                  ? 'color-mix(in srgb, var(--accent-primary) 55%, var(--card-border))'
                  : 'color-mix(in srgb, var(--card-border) 85%, transparent)',
                background: dragOver
                  ? 'color-mix(in srgb, var(--accent-primary) 8%, transparent)'
                  : 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
              }}
            >
              <div
                className="flex size-12 items-center justify-center rounded-2xl sm:size-14"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                <Upload className="size-6 sm:size-7" aria-hidden />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {fileLabel ? 'Replace file' : 'Drag & drop or click to upload'}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                  {fileLabel ? (
                    <>
                      <FileText className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-w-[16rem] truncate sm:max-w-md">{fileLabel}</span>
                    </>
                  ) : (
                    'PDF or plain text · up to 5 MB'
                  )}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept=".pdf,.txt"
                required
                className="hidden"
                onChange={syncLabelFromInput}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label htmlFor="jobDescription" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              Job description{' '}
              <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                (optional — improves keyword analysis)
              </span>
            </label>
            <Textarea
              id="jobDescription"
              name="jobDescription"
              placeholder="Paste the job description here…"
              rows={5}
              maxLength={3000}
              className={cn(
                'min-h-[120px] resize-y rounded-xl border-2 px-4 py-3 text-sm shadow-none transition-[color,box-shadow] sm:text-base',
                'placeholder:opacity-80 focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:outline-none',
              )}
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {state.error && (
            <p
              className="rounded-xl border px-4 py-3 text-sm font-medium sm:text-base"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                color: 'var(--accent-danger)',
              }}
            >
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="landing-cta-lift inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] px-8 text-base font-semibold text-white disabled:pointer-events-none disabled:opacity-60 sm:h-[3.25rem] sm:text-lg"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
              boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                Analyzing…
              </>
            ) : (
              <>
                Check my resume
                <ArrowRight className="size-5" aria-hidden />
              </>
            )}
          </button>
        </form>
      </FreeToolFormCard>

      {inlineFallback && state.result && (
        <div className="mt-10 space-y-4">
          <p
            className="rounded-xl border px-4 py-3 text-center text-sm font-medium sm:text-base"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            Couldn&apos;t open the results page (browser storage blocked). Your score is shown below — try allowing
            site data or use another browser next time.
          </p>
          <AtsResultsView result={state.result} showBackLink={false} root="section" />
        </div>
      )}
    </div>
  );
}
