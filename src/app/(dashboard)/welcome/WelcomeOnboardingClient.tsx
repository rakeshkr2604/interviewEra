'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Sparkles } from 'lucide-react';
import { StepIndicator } from '@/components/onboarding/StepIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ROLE_QUICK_PICKS } from '@/lib/onboarding/role-quick-picks';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
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
  };
};

const STEP_LABELS = ['You & role', 'Experience', 'Ready'];
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
  // Step 3 (resume) is skipped — map it to step 4 (Ready) so the UI lands on the summary screen.
  const resolvedInitialStep: ProfileOnboardingStep =
    initial.firstMissingStep === 3 ? 4 : initial.firstMissingStep;
  const [step, setStep] = useState<ProfileOnboardingStep>(resolvedInitialStep);
  const [name, setName] = useState(initial.profile.name.toLowerCase() === 'user' ? '' : initial.profile.name);
  const [preferredRole, setPreferredRole] = useState(initial.profile.preferredRole);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(
    initial.profile.experienceLevel,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void saveAction({ action: 'start' })
      .then(setServerState)
      .catch(() => {
        // Start telemetry/progress is best-effort; explicit Continue still reports errors.
      });
  }, []);

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

  // Map internal step (1,2,4) to visible indicator step (1,2,3) for the 3-step UI.
  const indicatorStep: ProfileOnboardingStep = step === 4 ? 3 : step;

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
          <StepIndicator currentStep={indicatorStep} totalSteps={3} labels={STEP_LABELS} />
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
            <Button
              className="min-h-11 w-full"
              disabled={busy || name.trim().length < 2 || preferredRole.trim().length < 2}
              onClick={() =>
                void runSave(
                  { action: 'save-step', step: 1, name, preferredRole },
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
                  4,
                )
              }
            />
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
              <SummaryRow
                label="Experience"
                value={EXPERIENCE_OPTIONS.find((option) => option.value === experienceLevel)?.label ?? 'Missing'}
                onEdit={() => setStep(2)}
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
              onClick={() => setStep(2)}
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
