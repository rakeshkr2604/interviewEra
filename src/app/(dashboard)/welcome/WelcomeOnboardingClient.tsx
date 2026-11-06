'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Loader2, Sparkles, Upload } from 'lucide-react';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROLE_QUICK_PICKS } from '@/lib/onboarding/role-quick-picks';
import { COMPANY_QUICK_PICKS } from '@/lib/onboarding/company-quick-picks';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import { formatPhoneDisplay } from '@/lib/utils/phone-format';
import type {
  ExperienceLevel,
  ProfileCompletionField,
  ProfileOnboardingState,
  ProfileOnboardingStep,
} from '@/lib/profile/onboarding-state';
import { profileFieldLabel } from '@/lib/profile/onboarding-state';

type OnboardingResponse = {
  state: ProfileOnboardingState;
  completionPercentage: number;
  completedFields: ProfileCompletionField[];
  missingFields: ProfileCompletionField[];
  firstMissingStep: ProfileOnboardingStep;
  profile: {
    name: string;
    preferredRole: string;
    experienceLevel: ExperienceLevel | null;
    phoneNumber: string | null;
    targetCompanies: string[];
  };
  resume: { id: string; status: string; isPrimary: boolean } | null;
};

const STEP_LABELS = ['You & role', 'Experience', 'Resume', 'Ready'];
const RESUME_ACCEPT = '.pdf,.txt';
const MAX_TARGET_COMPANIES = 5;
const EXPERIENCE_OPTIONS: Array<{ value: ExperienceLevel; label: string; detail: string }> = [
  { value: 'fresher', label: 'Student / Fresher', detail: 'No full-time experience yet' },
  { value: 'junior', label: 'Junior', detail: '1–2 years' },
  { value: 'mid', label: 'Mid-level', detail: '3–5 years' },
  { value: 'senior', label: 'Senior', detail: '6+ years' },
];

async function saveAction(body: Record<string, unknown>): Promise<OnboardingResponse> {
  const response = await fetch('/api/account/onboarding', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as
    | (OnboardingResponse & { error?: string })
    | null;
  if (!response.ok || !data) throw new Error(data?.error ?? 'Could not save your profile.');
  return data;
}

export function WelcomeOnboardingClient({ initial }: { initial: OnboardingResponse }) {
  const router = useRouter();
  const [serverState, setServerState] = useState(initial);
  const [step, setStep] = useState<ProfileOnboardingStep>(initial.firstMissingStep);
  const [name, setName] = useState(initial.profile.name.toLowerCase() === 'user' ? '' : initial.profile.name);
  const [preferredRole, setPreferredRole] = useState(initial.profile.preferredRole);
  const [phoneNumber, setPhoneNumber] = useState(formatPhoneDisplay(initial.profile.phoneNumber ?? ''));
  const [targetCompanies, setTargetCompanies] = useState<string[]>(initial.profile.targetCompanies);
  const [customCompany, setCustomCompany] = useState('');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(
    initial.profile.experienceLevel,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [resumeId, setResumeId] = useState<string | null>(initial.resume?.id ?? null);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState('');
  const resumeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void saveAction({ action: 'start' })
      .then(setServerState)
      .catch(() => {
        // Start telemetry/progress is best-effort; explicit Continue still reports errors.
      });
  }, []);

  const handleResumeUpload = async (file: File) => {
    setResumeUploading(true);
    setResumeError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/resume/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const uploadJson = (await uploadRes.json().catch(() => null)) as
        | { resumeId?: string; error?: string }
        | null;
      if (!uploadRes.ok || !uploadJson?.resumeId) {
        throw new Error(uploadJson?.error ?? 'Could not upload your resume.');
      }
      setResumeId(uploadJson.resumeId);
      setResumeFileName(file.name);
      // Structured parsing runs in the background — onboarding only needs the
      // file on record, not the parsed skills/experience, to move forward.
      void fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resumeId: uploadJson.resumeId }),
      }).catch(() => {});
    } catch (uploadError) {
      setResumeId(null);
      setResumeError(uploadError instanceof Error ? uploadError.message : 'Could not upload your resume.');
    } finally {
      setResumeUploading(false);
    }
  };

  const runSave = async (body: Record<string, unknown>, nextStep: ProfileOnboardingStep) => {
    setBusy(true);
    setError('');
    try {
      const result = await saveAction(body);
      setServerState(result);
      setStep(nextStep);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (destination: string) => {
    setBusy(true);
    setError('');
    try {
      await saveAction({ action: 'complete' });
      router.push(destination);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not complete onboarding.');
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl overflow-x-hidden pb-8">
      <header className="mb-5 text-center sm:mb-7">
        <div
          className="mx-auto mb-3 flex size-10 items-center justify-center rounded-2xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Sparkles className="size-5" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--text-primary)' }}>
          Let&apos;s personalize your preparation
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          Three short steps help InterviewEra tailor practice without turning signup into a long form.
        </p>
        <div className="mx-auto mt-4 max-w-xl">
          <StepIndicator currentStep={step} totalSteps={4} labels={STEP_LABELS} />
        </div>
      </header>

      <section className="dashboard-premium-card mx-auto max-w-2xl px-4 py-5 sm:px-7 sm:py-7">
        {step === 1 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>You and your target role</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                We use your role to tailor interview questions and recommendations.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-name">Full name</Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                autoComplete="name"
                placeholder="Rahul Sharma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-role">Target role</Label>
              <Input
                id="onboarding-role"
                value={preferredRole}
                onChange={(event) => setPreferredRole(event.target.value)}
                maxLength={120}
                placeholder="Software Engineer"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {ROLE_QUICK_PICKS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    aria-pressed={preferredRole === role}
                    onClick={() => setPreferredRole(role)}
                    className="min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor:
                        preferredRole === role ? 'var(--accent-primary)' : 'var(--card-border)',
                      background:
                        preferredRole === role
                          ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                          : 'var(--bg-secondary)',
                      color: preferredRole === role ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-phone">Phone number</Label>
              <Input
                id="onboarding-phone"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                onBlur={(event) => setPhoneNumber(formatPhoneDisplay(event.target.value))}
                maxLength={20}
                autoComplete="tel"
                placeholder="+91 98765 43210"
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Used to reach you about your interview preparation — never shared publicly.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="onboarding-target-companies">
                Target companies{' '}
                <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                  (optional)
                </span>
              </Label>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                For a more personalized interview — we tailor questions closer to how these
                companies actually interview.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {COMPANY_QUICK_PICKS.map((company) => {
                  const selected = targetCompanies.includes(company);
                  return (
                    <button
                      key={company}
                      type="button"
                      aria-pressed={selected}
                      disabled={!selected && targetCompanies.length >= MAX_TARGET_COMPANIES}
                      onClick={() =>
                        setTargetCompanies((prev) =>
                          selected ? prev.filter((c) => c !== company) : [...prev, company],
                        )
                      }
                      className="min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        borderColor: selected ? 'var(--accent-primary)' : 'var(--card-border)',
                        background: selected
                          ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)'
                          : 'var(--bg-secondary)',
                        color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {company}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <Input
                  id="onboarding-target-companies"
                  value={customCompany}
                  onChange={(event) => setCustomCompany(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    event.preventDefault();
                    const value = customCompany.trim();
                    if (
                      value.length < 2 ||
                      targetCompanies.includes(value) ||
                      targetCompanies.length >= MAX_TARGET_COMPANIES
                    ) {
                      return;
                    }
                    setTargetCompanies((prev) => [...prev, value]);
                    setCustomCompany('');
                  }}
                  maxLength={120}
                  placeholder="Add another company"
                  disabled={targetCompanies.length >= MAX_TARGET_COMPANIES}
                />
              </div>
              {targetCompanies.filter((c) => !(COMPANY_QUICK_PICKS as readonly string[]).includes(c))
                .length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {targetCompanies
                    .filter((c) => !(COMPANY_QUICK_PICKS as readonly string[]).includes(c))
                    .map((company) => (
                      <span
                        key={company}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                        style={{
                          borderColor: 'var(--accent-primary)',
                          background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                          color: 'var(--accent-primary)',
                          border: '1px solid',
                        }}
                      >
                        {company}
                        <button
                          type="button"
                          aria-label={`Remove ${company}`}
                          onClick={() =>
                            setTargetCompanies((prev) => prev.filter((c) => c !== company))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
            <Button
              className="min-h-11 w-full"
              disabled={
                busy ||
                name.trim().length < 2 ||
                preferredRole.trim().length < 2 ||
                phoneNumber.replace(/[^0-9]/g, '').length < 7
              }
              onClick={() =>
                void runSave(
                  {
                    action: 'save-step',
                    step: 1,
                    name,
                    preferredRole,
                    phoneNumber: phoneNumber.trim(),
                    targetCompanies,
                  },
                  2,
                )
              }
            >
              {busy ? 'Saving…' : 'Continue'} <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Tell us where you are</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Experience helps us calibrate interview difficulty and guidance.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {EXPERIENCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={experienceLevel === option.value}
                  onClick={() => setExperienceLevel(option.value)}
                  className="min-h-20 rounded-2xl border p-4 text-left transition-colors"
                  style={{
                    borderColor:
                      experienceLevel === option.value ? 'var(--accent-primary)' : 'var(--card-border)',
                    background:
                      experienceLevel === option.value
                        ? 'color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg))'
                        : 'var(--bg-secondary)',
                  }}
                >
                  <span className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{option.label}</span>
                  <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>{option.detail}</span>
                </button>
              ))}
            </div>
            <NavigationRow
              busy={busy}
              continueDisabled={!experienceLevel}
              onBack={() => setStep(1)}
              onContinue={() =>
                experienceLevel &&
                void runSave(
                  { action: 'save-step', step: 2, experienceLevel },
                  3,
                )
              }
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Add your resume</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                We tailor interview questions to your actual background — projects, skills, and experience.
              </p>
            </div>

            <input
              ref={resumeInputRef}
              type="file"
              accept={RESUME_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void handleResumeUpload(file);
              }}
            />

            {resumeId ? (
              <div
                className="flex items-center gap-3 rounded-2xl border p-4"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-success) 40%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
                }}
              >
                <CheckCircle2 className="size-5 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {resumeFileName ?? 'Resume on file'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Uploaded</p>
                </div>
                <button
                  type="button"
                  disabled={resumeUploading}
                  onClick={() => resumeInputRef.current?.click()}
                  className="min-h-9 shrink-0 px-2 text-xs font-semibold"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={resumeUploading}
                onClick={() => resumeInputRef.current?.click()}
                className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-6 text-center transition-colors"
                style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
              >
                {resumeUploading ? (
                  <Loader2 className="size-6 animate-spin" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                ) : (
                  <Upload className="size-6" style={{ color: 'var(--text-muted)' }} aria-hidden />
                )}
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {resumeUploading ? 'Uploading…' : 'Upload your resume (PDF or TXT)'}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Up to a few MB</span>
              </button>
            )}

            {resumeError ? (
              <p className="text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>
                {resumeError}
              </p>
            ) : null}

            <NavigationRow
              busy={busy}
              continueDisabled={resumeUploading || !resumeId}
              onBack={() => setStep(2)}
              onContinue={() =>
                void runSave({ action: 'save-step', step: 3, resumeId }, 4)
              }
            />
            <button
              type="button"
              disabled={busy || resumeUploading}
              className="mx-auto block text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => void runSave({ action: 'save-step', step: 3, resumeId: null }, 4)}
            >
              Skip for now
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="text-center">
              <CheckCircle2 className="mx-auto size-9" style={{ color: 'var(--accent-success)' }} aria-hidden />
              <h2 className="mt-3 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Your preparation workspace is ready</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Profile completion: {serverState.completionPercentage}%
              </p>
            </div>
            <div className="divide-y rounded-2xl border" style={{ borderColor: 'var(--card-border)' }}>
              <SummaryRow label="Name" value={name || 'Missing'} onEdit={() => setStep(1)} />
              <SummaryRow label="Target role" value={preferredRole || 'Missing'} onEdit={() => setStep(1)} />
              <SummaryRow label="Phone number" value={phoneNumber || 'Missing'} onEdit={() => setStep(1)} />
              <SummaryRow
                label="Target companies"
                value={targetCompanies.length > 0 ? targetCompanies.join(', ') : 'Not added (optional)'}
                onEdit={() => setStep(1)}
              />
              <SummaryRow
                label="Experience"
                value={EXPERIENCE_OPTIONS.find((option) => option.value === experienceLevel)?.label ?? 'Missing'}
                onEdit={() => setStep(2)}
              />
              <SummaryRow
                label="Resume"
                value={resumeId ? (resumeFileName ?? 'Uploaded') : 'Missing'}
                onEdit={() => setStep(3)}
              />
            </div>
            {serverState.completionPercentage < 100 ? (
              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Missing: {serverState.missingFields.map(profileFieldLabel).join(', ') || 'None'}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                className="min-h-11"
                disabled={busy}
                onClick={() => void finish(getDefaultInterviewStartPath())}
              >
                {busy ? 'Finishing…' : 'Start your first interview'}
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => void finish('/dashboard')}
              >
                Go to dashboard
              </Button>
            </div>
            <button
              type="button"
              className="mx-auto flex min-h-10 items-center gap-1 text-sm font-medium"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setStep(3)}
            >
              <ChevronLeft className="size-4" aria-hidden /> Back
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function NavigationRow({
  busy,
  continueDisabled,
  continueLabel = 'Continue',
  onBack,
  onContinue,
}: {
  busy: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      <Button variant="ghost" className="min-h-11" disabled={busy} onClick={onBack}>
        <ChevronLeft className="size-4" aria-hidden /> Back
      </Button>
      <Button className="min-h-11 sm:min-w-36" disabled={busy || continueDisabled} onClick={onContinue}>
        {busy ? 'Saving…' : continueLabel} <ChevronRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <FileText className="size-4 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="min-h-9 px-2 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
        Edit
      </button>
    </div>
  );
}
