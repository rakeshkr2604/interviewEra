'use client';

import { useActionState, useEffect, useState, useRef, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { generateQuestionsAction, type GeneratedQuestion } from './actions';
import { QUESTIONS_RESULT_STORAGE_KEY, serializeQuestions } from './question-generator-result-storage';
import { QuestionGeneratorResultsView } from './QuestionGeneratorResultsView';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { AuthErrorBanner, FormWarningBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_HELPER_TEXT_CLASS,
  IE_INPUT_TOOL_CLASS,
  IE_LABEL_CLASS,
  IE_SELECT_TOOL_CLASS,
} from '@/lib/theme/component-classes';
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

const selectClassName = IE_SELECT_TOOL_CLASS;

function useNativeSelectOptionProps(theme: 'dark' | 'light') {
  const isDark = theme === 'dark';
  return {
    style: {
      backgroundColor: isDark ? 'var(--bg-tertiary)' : '#ffffff',
      color: isDark ? 'var(--text-primary)' : '#0f172a',
    } satisfies CSSProperties,
  };
}

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
      });
      return;
    }
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
          <div className={IE_FIELD_GROUP_CLASS}>
            <Label htmlFor="role" className={IE_LABEL_CLASS}>
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
              className={cn(IE_INPUT_TOOL_CLASS, 'bg-transparent')}
              style={IE_FIELD_SURFACE_STYLE}
            />
            <p className={IE_HELPER_TEXT_CLASS}>
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

          {state.error ? <AuthErrorBanner message={state.error} /> : null}

          <FormSubmitButton
            loading={isPending}
            loadingLabel="Generating…"
            className="sm:text-lg"
            icon={<Sparkles className="size-5" aria-hidden />}
          >
            Generate questions
          </FormSubmitButton>
        </form>
      </FreeToolFormCard>

      {inlineFallback && state.questions && state.questions.length > 0 && (
        <div className="mt-10 space-y-4">
          <FormWarningBanner message="Couldn&apos;t open the results page (browser storage blocked). Your questions are shown below — try allowing site data or use another browser next time." />
          <QuestionGeneratorResultsView questions={state.questions} showBackLink={false} root="section" />
        </div>
      )}
    </div>
  );
}
