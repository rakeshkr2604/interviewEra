'use client';

import { useActionState, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Lock, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { buildStarAction } from './actions';
import type { StarState } from './actions';
import { STAR_RESULT_STORAGE_KEY, serializeStarPayload } from './star-result-storage';
import { StarBuilderResultsView } from './StarBuilderResultsView';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import {
  FreeToolAuthGate,
  isFreeToolGateCode,
  useFreeToolAuthGate,
} from '@/components/tools/FreeToolAuthGate';
import { AuthErrorBanner, FormWarningBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_INPUT_TOOL_CLASS,
  IE_LABEL_CLASS,
  IE_SELECT_TOOL_CLASS,
  IE_TEXTAREA_TOOL_CLASS,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

const initialState: StarState = {};

const STAR_FIELDS = [
  {
    id: 'situation',
    name: 'situation',
    accentBorder: 'hsla(199, 89%, 48%, 0.4)',
    accentBg: 'hsla(199, 89%, 48%, 0.08)',
    letter: 'S',
    labelText: 'ituation',
    hint: 'What was the context?',
    placeholder:
      'e.g. During my internship, our team was behind on a critical deadline...',
  },
  {
    id: 'task',
    name: 'task',
    accentBorder: 'hsla(271, 81%, 56%, 0.4)',
    accentBg: 'hsla(271, 81%, 56%, 0.08)',
    letter: 'T',
    labelText: 'ask',
    hint: 'What was your responsibility?',
    placeholder:
      'e.g. I was responsible for redesigning the API to reduce latency...',
  },
  {
    id: 'action',
    name: 'action',
    accentBorder: 'hsla(24, 95%, 53%, 0.4)',
    accentBg: 'hsla(24, 95%, 53%, 0.08)',
    letter: 'A',
    labelText: 'ction',
    hint: 'What did you do specifically?',
    placeholder:
      'e.g. I analyzed the bottleneck, proposed a caching layer, and implemented it...',
  },
  {
    id: 'result',
    name: 'result',
    accentBorder: 'hsla(152, 69%, 40%, 0.4)',
    accentBg: 'hsla(152, 69%, 40%, 0.08)',
    letter: 'R',
    labelText: 'esult',
    hint: 'What was the outcome? Include numbers if possible.',
    placeholder:
      'e.g. Reduced API latency by 40%, shipping two weeks ahead of schedule...',
  },
] as const;

function SelectShell({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={IE_FIELD_GROUP_CLASS}>
      <Label htmlFor={id} className={IE_LABEL_CLASS}>
        {label}
      </Label>
      <div className="group relative">
        {children}
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50 transition-opacity group-hover:opacity-70"
          style={{ color: 'var(--text-secondary)' }}
          aria-hidden
        />
      </div>
    </div>
  );
}

const selectClassName = cn(IE_SELECT_TOOL_CLASS, 'bg-transparent');

function useNativeSelectFieldStyles(theme: 'dark' | 'light') {
  const isDark = theme === 'dark';
  const optionProps = {
    style: {
      backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
      color: isDark ? 'var(--text-primary)' : '#0f172a',
    } satisfies CSSProperties,
  };
  const selectFieldStyle: CSSProperties = {
    borderColor: 'var(--card-border)',
    color: 'var(--text-primary)',
    backgroundColor: isDark ? 'var(--bg-secondary)' : 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
    colorScheme: isDark ? 'dark' : 'light',
  };
  return { optionProps, selectFieldStyle };
}

const inputClass = cn(IE_INPUT_TOOL_CLASS, 'bg-transparent');
const textareaClass = cn(IE_TEXTAREA_TOOL_CLASS, 'bg-transparent');

const MIN_LEN = 10;

const DRAFT_KEY = 'ie-tool-draft:star';
const DRAFT_FIELDS = ['targetRole', 'level', 'domain', 'situation', 'task', 'action', 'result'] as const;

function saveStarDraft(form: HTMLFormElement | null) {
  if (!form) return;
  const data = new FormData(form);
  const draft: Record<string, string> = {};
  for (const name of DRAFT_FIELDS) {
    const value = data.get(name);
    if (typeof value === 'string' && value) draft[name] = value.slice(0, 2500);
  }
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable */
  }
}

function restoreStarDraft(form: HTMLFormElement | null) {
  if (!form) return;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    sessionStorage.removeItem(DRAFT_KEY);
    const draft = JSON.parse(raw) as Record<string, unknown>;
    for (const name of DRAFT_FIELDS) {
      const el = form.elements.namedItem(name);
      const value = draft[name];
      if (typeof value !== 'string') continue;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        el.value = value;
      } else if (el instanceof HTMLSelectElement && [...el.options].some((o) => o.value === value)) {
        el.value = value;
      }
    }
  } catch {
    /* ignore malformed draft */
  }
}

export function StarBuilderForm() {
  const router = useRouter();
  const redirectDoneRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { resolvedTheme } = useTheme();
  const { optionProps, selectFieldStyle } = useNativeSelectFieldStyles(resolvedTheme);
  const [state, formAction, isPending] = useActionState(buildStarAction, initialState);
  const [inlineFallback, setInlineFallback] = useState(false);
  const { gateReason, openGate, closeGate, blockIfSignedOut } = useFreeToolAuthGate('star');
  const serverGateCode = isFreeToolGateCode(state.code) ? state.code : null;

  useEffect(() => {
    restoreStarDraft(formRef.current);
  }, []);

  useEffect(() => {
    if (!serverGateCode) return;
    saveStarDraft(formRef.current);
    openGate(serverGateCode);
  }, [state, serverGateCode, openGate]);

  useEffect(() => {
    const res = state.result;
    if (!res || redirectDoneRef.current) return;
    redirectDoneRef.current = true;
    try {
      sessionStorage.setItem(STAR_RESULT_STORAGE_KEY, serializeStarPayload(res, state.notice));
    } catch {
      redirectDoneRef.current = false;
      queueMicrotask(() => {
        setInlineFallback(true);
      });
      return;
    }
    router.replace('/tools/star-builder/results');
  }, [state.result, state.notice, router]);

  const fieldShellStyle = (border: string, bg: string): CSSProperties => ({
    borderColor: border,
    background: bg,
  });

  return (
    <div className="space-y-8">
      <FreeToolFormCard
        headerEyebrow="Builder"
        headerTitle="Build your answer"
        headerSubtitle={`Add context (role, level, domain), then one short paragraph per STAR letter. Minimum ${MIN_LEN} characters each field.`}
        headerBadge={
          <p
            className="flex max-w-[220px] shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs leading-snug"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-muted)',
              background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
            }}
          >
            <Lock className="size-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            Not saved to your account — processed for this response only.
          </p>
        }
      >
        <form
          ref={formRef}
          action={formAction}
          className="space-y-6 p-5 sm:p-7 lg:p-8"
          onSubmit={(e) => {
            if (blockIfSignedOut()) {
              e.preventDefault();
              saveStarDraft(e.currentTarget);
              return;
            }
            closeGate();
          }}
        >
          <div className={IE_FIELD_GROUP_CLASS}>
            <Label htmlFor="targetRole" className={IE_LABEL_CLASS}>
              Target role
            </Label>
            <Input
              id="targetRole"
              name="targetRole"
              placeholder="e.g. Software Engineer, Product Manager"
              required
              disabled={isPending}
              maxLength={100}
              className={inputClass}
              style={IE_FIELD_SURFACE_STYLE}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectShell id="level" label="Experience level">
              <select
                id="level"
                name="level"
                className={selectClassName}
                style={selectFieldStyle}
                defaultValue="fresher"
                disabled={isPending}
              >
                <option {...optionProps} value="fresher">
                  Fresher (0–1 year)
                </option>
                <option {...optionProps} value="1-3 years">
                  1–3 years
                </option>
                <option {...optionProps} value="3+ years">
                  3+ years
                </option>
              </select>
            </SelectShell>

            <SelectShell id="domain" label="Domain">
              <select
                id="domain"
                name="domain"
                className={selectClassName}
                style={selectFieldStyle}
                defaultValue="general"
                disabled={isPending}
              >
                <option {...optionProps} value="general">
                  General
                </option>
                <option {...optionProps} value="software engineering">
                  Software engineering
                </option>
                <option {...optionProps} value="product management">
                  Product management
                </option>
                <option {...optionProps} value="data science">
                  Data science
                </option>
                <option {...optionProps} value="marketing">
                  Marketing
                </option>
              </select>
            </SelectShell>
          </div>

          <div className="space-y-4">
            {STAR_FIELDS.map((field, index) => (
              <div
                key={field.id}
                className="rounded-xl border-2 p-4 transition-shadow duration-200 focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] sm:p-5"
                style={fieldShellStyle(field.accentBorder, field.accentBg)}
              >
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <Label htmlFor={field.id} className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    <span className="font-bold tabular-nums">{field.letter}</span>
                    {field.labelText}
                    <span className="ml-2 font-normal" style={{ color: 'var(--text-muted)' }}>
                      — {field.hint}
                    </span>
                  </Label>
                  <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Step {index + 1}/4
                  </span>
                </div>
                <Textarea
                  id={field.id}
                  name={field.name}
                  placeholder={field.placeholder}
                  rows={3}
                  required
                  minLength={MIN_LEN}
                  maxLength={2500}
                  disabled={isPending}
                  className={textareaClass}
                  style={IE_FIELD_SURFACE_STYLE}
                />
              </div>
            ))}
          </div>

          {gateReason ? (
            <FreeToolAuthGate tool="star" reason={gateReason} onDismiss={closeGate} />
          ) : state.error && !serverGateCode ? (
            <AuthErrorBanner message={state.error} />
          ) : null}

          <FormSubmitButton
            loading={isPending}
            loadingLabel="Building your answer…"
            className="sm:text-lg"
            icon={<Sparkles className="size-5" aria-hidden />}
          >
            Build my STAR answer
          </FormSubmitButton>
        </form>
      </FreeToolFormCard>

      {inlineFallback && state.result && (
        <div className="mt-10 space-y-4">
          <FormWarningBanner message="Couldn&apos;t open the results page (browser storage blocked). Your answer is shown below — try allowing site data or use another browser next time." />
          <StarBuilderResultsView
            result={state.result}
            notice={state.notice}
            showBackLink={false}
            root="section"
          />
        </div>
      )}
    </div>
  );
}
