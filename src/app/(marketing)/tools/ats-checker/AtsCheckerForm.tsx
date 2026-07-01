'use client';

import { useRef, useActionState, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText, Upload } from 'lucide-react';
import { AuthErrorBanner, FormWarningBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import {
  IE_LABEL_CLASS,
  IE_LABEL_OPTIONAL_CLASS,
  IE_TEXTAREA_TOOL_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_UPLOAD_ZONE_CLASS,
  IE_UPLOAD_ZONE_DRAG_STYLE,
  IE_UPLOAD_ZONE_IDLE_STYLE,
  IE_UPLOAD_ICON_SHELL_CLASS,
  IE_UPLOAD_ICON_SHELL_STYLE,
} from '@/lib/theme/component-classes';
import { Textarea } from '@/components/ui/textarea';
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

type JdMode = 'paste' | 'upload';

export function AtsCheckerForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const redirectDoneRef = useRef(false);
  const [state, formAction, isPending] = useActionState(checkAtsAction, initialState);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  /** Browsers cannot focus a `display:none` + `required` file input for HTML5 validation (throws in console, blocks submit). */
  const [clientError, setClientError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [inlineFallback, setInlineFallback] = useState(false);
  const [jdMode, setJdMode] = useState<JdMode>('paste');
  const [jdFileLabel, setJdFileLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!state.result || redirectDoneRef.current) return;
    redirectDoneRef.current = true;
    try {
      sessionStorage.setItem(ATS_RESULT_STORAGE_KEY, serializeAtsResult(state.result));
    } catch {
      redirectDoneRef.current = false;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInlineFallback(true);
      return;
    }
    router.replace('/tools/ats-checker/results');
  }, [state.result, router]);

  const syncLabelFromInput = useCallback(() => {
    const f = fileInputRef.current?.files?.[0];
    setFileLabel(f ? f.name : null);
    if (f) setClientError(null);
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
      setClientError(null);
    },
    [],
  );

  return (
    <div className="space-y-8">
      <FreeToolFormCard
        headerEyebrow="Analyzer"
        headerTitle="Upload resume · optional job description · instant report"
      >
        <form
          action={formAction}
          className="space-y-6 p-5 sm:p-7 lg:p-8"
          onSubmit={(e) => {
            setClientError(null);
            if (!fileInputRef.current?.files?.length) {
              e.preventDefault();
              setClientError('Please upload a resume (PDF or TXT · max 5 MB).');
            }
          }}
        >
          <div className="space-y-2.5">
            <label className={IE_LABEL_CLASS}>
              Resume{' '}
              <span className={IE_LABEL_OPTIONAL_CLASS}>(PDF or TXT · max 5 MB)</span>
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
              className={cn(IE_UPLOAD_ZONE_CLASS, dragOver && 'scale-[1.01]')}
              style={dragOver ? IE_UPLOAD_ZONE_DRAG_STYLE : IE_UPLOAD_ZONE_IDLE_STYLE}
            >
              <div className={IE_UPLOAD_ICON_SHELL_CLASS} style={IE_UPLOAD_ICON_SHELL_STYLE}>
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
                className="hidden"
                onChange={syncLabelFromInput}
                aria-invalid={Boolean(clientError)}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="jobDescription" className="block text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                Job description{' '}
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                  (optional — improves keyword analysis)
                </span>
              </label>
              <div
                role="tablist"
                aria-label="Job description input mode"
                className="inline-flex rounded-lg border p-0.5 text-xs font-medium"
                style={{ borderColor: 'var(--card-border)' }}
              >
                {(['paste', 'upload'] as const).map((m) => {
                  const active = jdMode === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setJdMode(m)}
                      className="rounded-md px-3 py-1.5 transition-colors"
                      style={{
                        background: active ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' : 'transparent',
                        color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {m === 'paste' ? 'Paste text' : 'Upload PDF'}
                    </button>
                  );
                })}
              </div>
            </div>

            {jdMode === 'paste' ? (
              <Textarea
                id="jobDescription"
                name="jobDescription"
                placeholder="Paste the job description here…"
                rows={5}
                maxLength={3000}
                className={IE_TEXTAREA_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
            ) : (
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    jdFileInputRef.current?.click();
                  }
                }}
                onClick={() => jdFileInputRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-5 transition-colors"
                style={{
                  borderColor: 'color-mix(in srgb, var(--card-border) 85%, transparent)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
                }}
              >
                <FileText className="size-5 shrink-0" aria-hidden style={{ color: 'var(--accent-primary)' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {jdFileLabel ? 'Replace job description file' : 'Upload job description (PDF or TXT · max 5 MB)'}
                  </p>
                  {jdFileLabel ? (
                    <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
                      {jdFileLabel}
                    </p>
                  ) : null}
                </div>
                <input
                  ref={jdFileInputRef}
                  type="file"
                  name="jobDescriptionFile"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setJdFileLabel(f ? f.name : null);
                  }}
                />
              </div>
            )}
          </div>

          {(clientError ?? state.error) ? (
            <AuthErrorBanner message={clientError ?? state.error ?? ''} />
          ) : null}

          <FormSubmitButton loading={isPending} loadingLabel="Analyzing…" className="sm:text-lg">
            <>
              Check my resume
              <ArrowRight className="size-5" aria-hidden />
            </>
          </FormSubmitButton>
        </form>
      </FreeToolFormCard>

      {inlineFallback && state.result && (
        <div className="mt-10 space-y-4">
          <FormWarningBanner message="Couldn&apos;t open the results page (browser storage blocked). Your score is shown below — try allowing site data or use another browser next time." />
          <AtsResultsView result={state.result} showBackLink={false} root="section" />
        </div>
      )}
    </div>
  );
}
