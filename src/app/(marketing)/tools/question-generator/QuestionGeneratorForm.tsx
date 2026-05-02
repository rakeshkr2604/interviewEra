'use client';

import { useActionState, useEffect, useState, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { posthog } from '@/lib/analytics/posthog';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { generateQuestionsAction, type GeneratedQuestion } from './actions';
import { QUESTIONS_RESULT_STORAGE_KEY, serializeQuestions } from './question-generator-result-storage';
import { QuestionGeneratorResultsView } from './QuestionGeneratorResultsView';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { cn } from '@/lib/utils';

interface ActionState {
  questions?: GeneratedQuestion[];
  error?: string;
}

const initialState: ActionState = {};

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
    <div className="space-y-2.5">
      <Label htmlFor={id} className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
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

const selectClassName = cn(
  'h-11 w-full cursor-pointer appearance-none rounded-xl border-2 bg-transparent pl-3.5 pr-10 text-sm font-medium',
  'transition-[border-color,box-shadow] duration-200 outline-none',
  'hover:border-[color-mix(in_srgb,var(--accent-primary)_35%,var(--card-border))]',
  'focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)]',
);

function useNativeSelectOptionProps(theme: 'dark' | 'light') {
  const isDark = theme === 'dark';
  return {
    style: {
      backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
      color: isDark ? 'var(--text-primary)' : '#0f172a',
    } satisfies CSSProperties,
  };
}

const inputClass = cn(
  'h-11 rounded-xl border-2 bg-transparent text-base transition-[color,box-shadow] sm:text-sm',
  'placeholder:opacity-80 focus-visible:border-[color-mix(in_srgb,var(--accent-primary)_45%,var(--card-border))] focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_25%,transparent)] focus-visible:outline-none',
);

const SUGGESTED_ROLES = [
  'Software Engineer',
  'Product Manager',
  'Data Scientist',
  'Business Analyst',
  'Marketing Manager',
  'Frontend Developer',
];

export function QuestionGeneratorForm() {
  const router = useRouter();
  const redirectDoneRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const [role, setRole] = useState('');
  const [inlineFallback, setInlineFallback] = useState(false);
  const [state, formAction, isPending] = useActionState(
    generateQuestionsAction,
    initialState,
  );
  const optionProps = useNativeSelectOptionProps(resolvedTheme);
  const selectFieldStyle: CSSProperties = {
    borderColor: 'var(--card-border)',
    color: 'var(--text-primary)',
    backgroundColor: resolvedTheme === 'dark' ? 'var(--bg-secondary)' : 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
    colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light',
  };

  useEffect(() => {
    const qs = state.questions;
    if (!qs?.length || redirectDoneRef.current) return;
    redirectDoneRef.current = true;
    try {
      sessionStorage.setItem(QUESTIONS_RESULT_STORAGE_KEY, serializeQuestions(qs));
    } catch {
      redirectDoneRef.current = false;
      queueMicrotask(() => {
        setInlineFallback(true);
        posthog.capture('tool_used', { toolName: 'question-generator' });
      });
      return;
    }
    posthog.capture('tool_used', { toolName: 'question-generator' });
    router.replace('/tools/question-generator/results');
  }, [state.questions, router]);

  return (
    <div className="space-y-8">
      <FreeToolFormCard
        headerEyebrow="Generator"
        headerTitle="Configure your set"
        headerSubtitle="We combine role, seniority, and domain so questions feel like a real screen."
        headerBadge={
          <span
            className="hidden shrink-0 rounded-xl border-2 px-2.5 py-1 text-xs font-semibold sm:inline-flex"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-muted)',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            }}
          >
            10 questions
          </span>
        }
      >
        <form action={formAction} className="space-y-6 p-5 sm:p-7 lg:p-8">
          <div className="space-y-2.5">
            <Label htmlFor="role" className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
              Target role
            </Label>
            <Input
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Engineer, Product Manager…"
              required
              minLength={2}
              maxLength={100}
              className={inputClass}
              style={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
                background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
              }}
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tip: include level in the role if you want (e.g. &quot;Senior Backend Engineer&quot;).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTED_ROLES.map((r) => {
                const active = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    className={cn(
                      'rounded-full border-2 px-3 py-1.5 text-xs font-medium transition-all duration-200',
                      'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
                    )}
                    style={{
                      borderColor: active ? 'var(--accent-primary)' : 'var(--card-border)',
                      background: active
                        ? 'color-mix(in srgb, var(--accent-primary) 18%, transparent)'
                        : 'transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      boxShadow: active
                        ? '0 0 0 1px color-mix(in srgb, var(--accent-primary) 40%, transparent)'
                        : undefined,
                    }}
                    onClick={() => setRole(r)}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectShell id="level" label="Experience level">
              <select
                id="level"
                name="level"
                className={selectClassName}
                style={selectFieldStyle}
                defaultValue="fresher"
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

          {state.error && (
            <p
              className="rounded-xl border-2 px-4 py-3 text-sm font-medium sm:text-base"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
                color: 'var(--accent-danger)',
              }}
              role="alert"
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
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="size-5" aria-hidden />
                Generate questions
              </>
            )}
          </button>
        </form>
      </FreeToolFormCard>

      {inlineFallback && state.questions && state.questions.length > 0 && (
        <div className="mt-10 space-y-4">
          <p
            className="rounded-xl border-2 px-4 py-3 text-center text-sm font-medium sm:text-base"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            Couldn&apos;t open the results page (browser storage blocked). Your questions are shown below — try allowing
            site data or use another browser next time.
          </p>
          <QuestionGeneratorResultsView questions={state.questions} showBackLink={false} root="section" />
        </div>
      )}
    </div>
  );
}
