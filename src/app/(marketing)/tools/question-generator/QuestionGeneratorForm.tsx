'use client';

import { useActionState, useEffect, useState, useRef, type CSSProperties } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, Info, Lightbulb, Sparkles, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { generateQuestionsAction, type GenerateResult } from './actions';
import { QUESTIONS_RESULT_STORAGE_KEY, serializeQuestions } from './question-generator-result-storage';
import { trackQgGenerate } from './qg-analytics';
import { useQgProfile, type QgProfileDraft } from './use-qg-profile';
import { QuestionGeneratorResultsView } from './QuestionGeneratorResultsView';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';
import { AuthErrorBanner, FormWarningBanner } from '@/components/auth/AuthErrorBanner';
import { FormSubmitButton } from '@/components/auth/AuthLoadingButton';
import {
  QG_COMPANY_MAX_CHARS,
  QG_JD_MAX_CHARS,
  QG_TOPIC_MAX_CHARS,
  type QgDomain,
  type QgLevel,
  type QgMode,
} from '@/lib/question-engine/schemas';
import { suggestDomainForRole } from '@/lib/question-engine/role-domain-map';
import { parseListInput } from '@/lib/question-engine/preference-profile';
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_HELPER_TEXT_CLASS,
  IE_INPUT_TOOL_CLASS,
  IE_LABEL_CLASS,
  IE_SELECT_TOOL_CLASS,
  IE_TEXTAREA_TOOL_CLASS,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

const initialState: GenerateResult = {};

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

const SUGGESTED_TOPICS = [
  'Agentic AI / AI Engineer',
  'System Design',
  'Data Structures & Algorithms',
  'SQL',
  'React',
  'OOP',
  'Behavioral Basics',
];

/** Shared chip-row pattern (used by the role and topic suggestion lists). */
function ChipPicker({
  options,
  value,
  onSelect,
}: {
  options: readonly string[];
  value: string;
  onSelect: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {options.map((option) => {
        const active = value === option;
        return (
          <button
            key={option}
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
            onClick={() => onSelect(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

const MODES: Array<{ id: QgMode; label: string; hint: string }> = [
  { id: 'role', label: 'By role', hint: 'Role, seniority, and domain' },
  { id: 'jd', label: 'Paste a JD', hint: 'Questions mapped to the job description' },
  { id: 'topic', label: 'By topic', hint: 'A specific subject to drill into' },
  { id: 'company', label: 'Company-style', hint: 'Role framed in a company\u2019s style' },
];

function companyDisclaimer(company: string): string {
  const target = company.trim() || 'the company you specify';
  return `These are AI-generated practice questions modeled on publicly documented interview processes, values, and role requirements. They are not real or leaked questions from ${target}, and actual questions will vary. Use them to practice, not to predict.`;
}

const DOMAIN_OPTIONS: Array<{ value: QgDomain; label: string }> = [
  { value: 'general', label: 'General' },
  { value: 'software engineering', label: 'Software engineering' },
  { value: 'product management', label: 'Product management' },
  { value: 'data science', label: 'Data science' },
  { value: 'marketing', label: 'Marketing' },
];

const DOMAIN_LABELS: Record<QgDomain, string> = Object.fromEntries(
  DOMAIN_OPTIONS.map((o) => [o.value, o.label]),
) as Record<QgDomain, string>;

const inlinePromptStyle: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
  background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
};

export function QuestionGeneratorForm() {
  const router = useRouter();
  const redirectDoneRef = useRef(false);
  const { resolvedTheme } = useTheme();
  const [role, setRole] = useState('');
  const [mode, setMode] = useState<QgMode>('role');
  const [jd, setJd] = useState('');
  const [topic, setTopic] = useState('');
  const [company, setCompany] = useState('');
  const [level, setLevel] = useState<QgLevel>('fresher');
  const [domain, setDomain] = useState<QgDomain>('general');
  const [degree, setDegree] = useState('');
  const [targetRolesText, setTargetRolesText] = useState('');
  const [targetCompaniesText, setTargetCompaniesText] = useState('');
  const [showMorePrefs, setShowMorePrefs] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [inlineFallback, setInlineFallback] = useState(false);
  const [state, formAction, isPending] = useActionState(
    generateQuestionsAction,
    initialState,
  );

  const qgProfile = useQgProfile();
  const { saveProfile } = qgProfile;
  // Once the user picks a domain themselves, auto-select must never override it
  // again (reset only on full page reload). Same guard for the level select.
  const domainTouchedRef = useRef(false);
  const levelTouchedRef = useRef(false);
  const prefillDoneRef = useRef(false);
  // Snapshot of the optional "More preferences" inputs for the post-generate
  // save effect, so those fields don't have to join the effect's deps.
  const morePrefsRef = useRef({ degree: '', targetRoles: '', targetCompanies: '' });
  useEffect(() => {
    morePrefsRef.current = {
      degree,
      targetRoles: targetRolesText,
      targetCompanies: targetCompaniesText,
    };
  }, [degree, targetRolesText, targetCompaniesText]);

  function handleRoleChange(nextRole: string) {
    setRole(nextRole);
    if (!domainTouchedRef.current) {
      setDomain(suggestDomainForRole(nextRole));
    }
  }

  // URL-param prefill for deep links from SEO/blog pages
  // (?mode=…&role=…&company=…&topic=…). Read via window.location on mount —
  // the page is statically prerendered, so useSearchParams() would need a
  // Suspense boundary. This effect runs before the saved-profile load can
  // finish (it awaits an auth probe), so URL params win for
  // mode/role/company/topic while the profile still fills the
  // level/domain/degree gaps afterwards (its role prefill is only-if-empty).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // queueMicrotask keeps setState out of the synchronous effect body (same
    // pattern as the profile-prefill effect below). It still resolves long
    // before the profile's async load completes.
    queueMicrotask(() => {
      const rawMode = params.get('mode');
      if (rawMode === 'role' || rawMode === 'jd' || rawMode === 'topic' || rawMode === 'company') {
        setMode(rawMode);
      }
      // Role max length is 100, matching the input's maxLength below.
      const urlRole = (params.get('role') ?? '').trim().slice(0, 100);
      if (urlRole) {
        setRole((current) => (current === '' ? urlRole : current));
        // Same domain auto-suggestion as typing the role; the saved profile's
        // domain (if any) still overwrites this, per the profile effect.
        setDomain((current) => (domainTouchedRef.current ? current : suggestDomainForRole(urlRole)));
      }
      const urlCompany = (params.get('company') ?? '').trim().slice(0, QG_COMPANY_MAX_CHARS);
      if (urlCompany) {
        setCompany((current) => (current === '' ? urlCompany : current));
      }
      const urlTopic = (params.get('topic') ?? '').trim().slice(0, QG_TOPIC_MAX_CHARS);
      if (urlTopic) {
        setTopic((current) => (current === '' ? urlTopic : current));
      }
    });
  }, []);

  // Prefill from the saved profile once it's loaded — after mount (never during
  // render) to avoid SSR/hydration mismatch, and never over values the user
  // has already typed or picked.
  useEffect(() => {
    if (!qgProfile.ready || prefillDoneRef.current) return;
    prefillDoneRef.current = true;
    const p = qgProfile.profile;
    if (!p) return;
    // queueMicrotask keeps setState out of the synchronous effect body (same
    // pattern as the inline-fallback path below).
    queueMicrotask(() => {
      const { role: pRole, level: pLevel, domain: pDomain, degree: pDegree } = p;
      if (pRole) setRole((current) => (current === '' ? pRole : current));
      if (pLevel && !levelTouchedRef.current) setLevel(pLevel);
      if (pDomain && !domainTouchedRef.current) setDomain(pDomain);
      if (pDegree) setDegree((current) => current || pDegree);
      if (p.target_roles?.length) {
        const joined = p.target_roles.join(', ');
        setTargetRolesText((current) => current || joined);
      }
      if (p.target_companies?.length) {
        const joined = p.target_companies.join(', ');
        setTargetCompaniesText((current) => current || joined);
      }
    });
  }, [qgProfile.ready, qgProfile.profile]);
  const optionProps = useNativeSelectOptionProps(resolvedTheme);
  const selectFieldStyle: CSSProperties = {
    borderColor: 'var(--card-border)',
    color: 'var(--text-primary)',
    backgroundColor: resolvedTheme === 'dark' ? 'var(--bg-secondary)' : 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
    colorScheme: resolvedTheme === 'dark' ? 'dark' : 'light',
  };

  useEffect(() => {
    const qs = state.questions;
    const meta = state.meta;
    if (!qs?.length || !meta || redirectDoneRef.current) return;
    redirectDoneRef.current = true;
    trackQgGenerate({
      mode: meta.mode,
      role: meta.role,
      level: meta.level,
      domain: meta.domain,
      cached: state.cached ?? false,
    });
    // Persist preferences from the server-validated meta. JD/topic mode carry
    // no role and force domain to 'general' — skip both so stored values
    // survive; role and company mode both carry a real role + domain.
    const metaIsRoleAnchored = meta.mode === 'role' || meta.mode === 'company';
    const prefs = morePrefsRef.current;
    const targetRoles = parseListInput(prefs.targetRoles);
    const targetCompanies = parseListInput(prefs.targetCompanies);
    const profilePatch: QgProfileDraft = {
      level: meta.level as QgLevel,
      ...(metaIsRoleAnchored && meta.role ? { role: meta.role } : {}),
      ...(metaIsRoleAnchored ? { domain: meta.domain as QgDomain } : {}),
      ...(prefs.degree.trim() ? { degree: prefs.degree.trim() } : {}),
      ...(targetRoles.length ? { target_roles: targetRoles } : {}),
      ...(targetCompanies.length ? { target_companies: targetCompanies } : {}),
    };
    saveProfile(profilePatch);
    try {
      sessionStorage.setItem(QUESTIONS_RESULT_STORAGE_KEY, serializeQuestions(qs, meta));
    } catch {
      redirectDoneRef.current = false;
      queueMicrotask(() => {
        setInlineFallback(true);
      });
      return;
    }
    router.replace('/tools/question-generator/results');
  }, [state.questions, state.meta, state.cached, router, saveProfile]);

  const isRoleAnchoredMode = mode === 'role' || mode === 'company';
  const suggestedDomain = suggestDomainForRole(role);
  const showDomainTip =
    isRoleAnchoredMode &&
    role.trim().length >= 2 &&
    suggestedDomain !== 'general' &&
    domain !== suggestedDomain;

  return (
    <div className="space-y-8">
      <FreeToolFormCard
        headerEyebrow="Generator"
        headerTitle="Configure your set"
        headerSubtitle="Every question comes with what the interviewer is testing — plus on-demand answer coaching."
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
          <input type="hidden" name="mode" value={mode} />

          <div className={IE_FIELD_GROUP_CLASS}>
            <Label className={IE_LABEL_CLASS}>Generation mode</Label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className="rounded-xl border-2 p-3 text-left text-sm font-medium transition-all duration-200"
                    style={
                      active
                        ? {
                            borderColor: 'var(--accent-primary)',
                            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                            color: 'var(--text-primary)',
                          }
                        : {
                            borderColor: 'var(--card-border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                          }
                    }
                  >
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {m.label}
                    </p>
                    <p className="mt-0.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                      {m.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {isRoleAnchoredMode && (
            <div className={IE_FIELD_GROUP_CLASS}>
              <Label htmlFor="role" className={IE_LABEL_CLASS}>
                Target role
              </Label>
              <Input
                id="role"
                name="role"
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
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
              <ChipPicker options={SUGGESTED_ROLES} value={role} onSelect={handleRoleChange} />
            </div>
          )}

          {mode === 'company' && (
            <div className={IE_FIELD_GROUP_CLASS}>
              <Label htmlFor="company" className={IE_LABEL_CLASS}>
                Target company
              </Label>
              <Input
                id="company"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value.slice(0, QG_COMPANY_MAX_CHARS))}
                placeholder="e.g. Amazon, TCS, Razorpay…"
                required
                minLength={2}
                maxLength={QG_COMPANY_MAX_CHARS}
                className={cn(IE_INPUT_TOOL_CLASS, 'bg-transparent')}
                style={IE_FIELD_SURFACE_STYLE}
              />
              <div
                className="flex items-start gap-1.5 rounded-lg border px-3 py-2"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-warning) 35%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-warning) 8%, transparent)',
                }}
                role="note"
              >
                <Info
                  className="mt-0.5 size-3.5 shrink-0"
                  style={{ color: 'var(--accent-warning)' }}
                  aria-hidden
                />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {companyDisclaimer(company)}
                </p>
              </div>
            </div>
          )}

          {mode === 'topic' && (
            <div className={IE_FIELD_GROUP_CLASS}>
              <Label htmlFor="topic" className={IE_LABEL_CLASS}>
                Subject / topic
              </Label>
              <Input
                id="topic"
                name="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value.slice(0, QG_TOPIC_MAX_CHARS))}
                placeholder="e.g. System Design, SQL Joins, React Hooks…"
                required
                minLength={2}
                maxLength={QG_TOPIC_MAX_CHARS}
                className={cn(IE_INPUT_TOOL_CLASS, 'bg-transparent')}
                style={IE_FIELD_SURFACE_STYLE}
              />
              <p className={IE_HELPER_TEXT_CLASS}>
                Questions stay focused on this topic, calibrated to your experience level below.
              </p>
              <ChipPicker options={SUGGESTED_TOPICS} value={topic} onSelect={setTopic} />
            </div>
          )}

          {mode === 'jd' && (
            <div className={IE_FIELD_GROUP_CLASS}>
              <Label htmlFor="jd" className={IE_LABEL_CLASS}>
                Job description
              </Label>
              <Textarea
                id="jd"
                name="jd"
                value={jd}
                onChange={(e) => setJd(e.target.value.slice(0, QG_JD_MAX_CHARS))}
                placeholder="Paste the job description — we map at least 6 of 10 questions to skills and responsibilities stated in it."
                required
                minLength={40}
                maxLength={QG_JD_MAX_CHARS}
                rows={8}
                className={cn(IE_TEXTAREA_TOOL_CLASS, 'bg-transparent')}
                style={IE_FIELD_SURFACE_STYLE}
              />
              <p className={IE_HELPER_TEXT_CLASS}>
                {jd.length.toLocaleString()}/{QG_JD_MAX_CHARS.toLocaleString()} characters. We read
                it as data only — no account needed.
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectShell id="level" label="Experience level">
              <select
                id="level"
                name="level"
                className={selectClassName}
                style={selectFieldStyle}
                value={level}
                onChange={(e) => {
                  levelTouchedRef.current = true;
                  setLevel(e.target.value as QgLevel);
                }}
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

            {isRoleAnchoredMode && (
              <div className="space-y-2">
                <SelectShell id="domain" label="Domain">
                  <select
                    id="domain"
                    name="domain"
                    className={selectClassName}
                    style={selectFieldStyle}
                    value={domain}
                    onChange={(e) => {
                      domainTouchedRef.current = true;
                      setDomain(e.target.value as QgDomain);
                    }}
                  >
                    {DOMAIN_OPTIONS.map((option) => (
                      <option {...optionProps} key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </SelectShell>
                {showDomainTip && (
                  <div
                    className="flex items-start gap-1.5 rounded-lg border px-3 py-2"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
                      background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                    }}
                    role="note"
                  >
                    <Lightbulb
                      className="mt-0.5 size-3.5 shrink-0"
                      style={{ color: 'var(--accent-primary)' }}
                      aria-hidden
                    />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      Tip: {role.trim()} roles usually pair with the{' '}
                      <span className="font-semibold">{DOMAIN_LABELS[suggestedDomain]}</span> domain —
                      keep your pick if it fits better.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl border-2" style={{ borderColor: 'var(--card-border)' }}>
            <button
              type="button"
              onClick={() => setShowMorePrefs((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold"
              style={{ color: 'var(--text-secondary)' }}
              aria-expanded={showMorePrefs}
            >
              <span>
                More preferences{' '}
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                  (optional — remembered for next time)
                </span>
              </span>
              <ChevronDown
                className={cn('size-4 shrink-0 transition-transform', showMorePrefs && 'rotate-180')}
                aria-hidden
              />
            </button>
            {showMorePrefs && (
              <div
                className="space-y-4 border-t px-4 pb-4 pt-4"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className={IE_FIELD_GROUP_CLASS}>
                  <Label htmlFor="qg-degree" className={IE_LABEL_CLASS}>
                    Degree
                  </Label>
                  <Input
                    id="qg-degree"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. MCA, B.Tech CSE"
                    maxLength={120}
                    className={cn(IE_INPUT_TOOL_CLASS, 'bg-transparent')}
                    style={IE_FIELD_SURFACE_STYLE}
                  />
                </div>
                <div className={IE_FIELD_GROUP_CLASS}>
                  <Label htmlFor="qg-target-roles" className={IE_LABEL_CLASS}>
                    Target roles
                  </Label>
                  <Input
                    id="qg-target-roles"
                    value={targetRolesText}
                    onChange={(e) => setTargetRolesText(e.target.value)}
                    placeholder="e.g. Backend Developer, SDE"
                    className={cn(IE_INPUT_TOOL_CLASS, 'bg-transparent')}
                    style={IE_FIELD_SURFACE_STYLE}
                  />
                  <p className={IE_HELPER_TEXT_CLASS}>Up to 5, comma-separated.</p>
                </div>
                <div className={IE_FIELD_GROUP_CLASS}>
                  <Label htmlFor="qg-target-companies" className={IE_LABEL_CLASS}>
                    Target companies
                  </Label>
                  <Input
                    id="qg-target-companies"
                    value={targetCompaniesText}
                    onChange={(e) => setTargetCompaniesText(e.target.value)}
                    placeholder="e.g. TCS, Infosys, Razorpay"
                    className={cn(IE_INPUT_TOOL_CLASS, 'bg-transparent')}
                    style={IE_FIELD_SURFACE_STYLE}
                  />
                  <p className={IE_HELPER_TEXT_CLASS}>Up to 5, comma-separated.</p>
                </div>
              </div>
            )}
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

      {qgProfile.showSignupCta && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 sm:px-5"
          style={inlinePromptStyle}
        >
          <p className="min-w-0 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Save your preferences across devices
            </span>{' '}
            — right now they only live in this browser.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/signup?next=/tools/question-generator"
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Sign up free
            </Link>
            <button
              type="button"
              onClick={qgProfile.dismissSignupCta}
              className="rounded-full p-1.5 transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
              aria-label="Dismiss"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {qgProfile.showAccountSyncPrompt && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 px-4 py-3.5 sm:px-5"
          style={inlinePromptStyle}
        >
          <p className="min-w-0 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Preferences found on this device
            </span>{' '}
            — save them to your account to use them anywhere?
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => {
                setSyncBusy(true);
                void qgProfile.syncLocalToAccount().finally(() => setSyncBusy(false));
              }}
              className={cn(
                'inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90',
                syncBusy && 'cursor-wait opacity-70',
              )}
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              {syncBusy ? 'Saving…' : 'Save to account'}
            </button>
            <button
              type="button"
              onClick={qgProfile.dismissAccountSyncPrompt}
              className="rounded-full px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {inlineFallback && state.questions && state.questions.length > 0 && state.meta && (
        <div className="mt-10 space-y-4">
          <FormWarningBanner message="Couldn&apos;t open the results page (browser storage blocked). Your questions are shown below — try allowing site data or use another browser next time." />
          <QuestionGeneratorResultsView
            questions={state.questions}
            meta={state.meta}
            showBackLink={false}
            root="section"
          />
        </div>
      )}
    </div>
  );
}
