'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader';
import { difficultyQuestionCount } from '@/lib/interview/difficulty-question-count';
import {
  readDefaultDifficulty,
  readPreferredInterviewerId,
} from '@/lib/settings/client-preferences';
import { unlockAudioForInterview } from '@/lib/voice/audio-gesture';
import {
  runStartInterviewWithTelemetry,
  stashStartupClickMeta,
} from '@/lib/telemetry/interview-startup-telemetry';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { cn } from '@/lib/utils';
import type { DomainPack, PlanTier } from '@/types/app.types';

const fieldClass =
  'rounded-xl border-2 bg-transparent text-sm transition-[color,box-shadow] focus-visible:ring-2 focus-visible:outline-none';

const ROLE_SUGGESTIONS = [
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'Backend Developer',
  'Full Stack Developer',
];

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type InterviewMode = 'ai' | 'domain_pack';

const DOMAIN_LABELS: Record<string, string> = {
  dsa: 'DSA',
  system_design: 'System Design',
  hr: 'HR & Behavioral',
};

interface StartInterviewFormProps {
  resumeId: string;
  resumeInfo: { targetRole: string; skillCount: number; experienceEstimate: string };
  creditsRemaining: number;
  planTier: PlanTier;
  domainPacks: DomainPack[];
}

export function StartInterviewForm({
  resumeId,
  resumeInfo,
  creditsRemaining,
  planTier,
  domainPacks,
}: StartInterviewFormProps) {
  const [role, setRole] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => readDefaultDifficulty());
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('ai');
  const [selectedPackId, setSelectedPackId] = useState<string>(domainPacks[0]?.id ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const isPro = planTier === 'pro' || planTier === 'campus';
  const isDisabled = loading || creditsRemaining === 0;
  const canSubmit =
    !isDisabled &&
    (interviewMode === 'ai' ? role.trim().length > 0 : selectedPackId.length > 0);

  async function handleStart() {
    if (!canSubmit) return;

    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.START_MOCK_INTERVIEW,
      ctaText: 'Start Interview (uses 1 credit)',
      section: 'interview_new',
      authenticated: true,
    });

    // Consume gesture token while the click is still active (helps some mobile browsers).
    unlockAudioForInterview();
    setLoading(true);
    setError(null);

    const result = await runStartInterviewWithTelemetry({
      unlockAudio: unlockAudioForInterview,
      createSession: async () => {
        try {
          const body: Record<string, unknown> = {
            resumeId,
            difficulty,
            interviewerId: readPreferredInterviewerId(),
          };

          if (interviewMode === 'ai') {
            body.role = role.trim();
            body.questionCount = difficultyQuestionCount(difficulty);
          } else {
            const pack = domainPacks.find((p) => p.id === selectedPackId);
            body.role = pack?.name ?? 'Domain Interview';
            body.domainPackId = selectedPackId;
            body.questionCount = pack?.question_count ?? 10;
          }

          const res = await fetch('/api/interview/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const data = (await res.json()) as {
            interviewId?: string;
            error?: string;
            preparing?: boolean;
            resumeUrl?: string;
          };

          if (!res.ok) {
            if (res.status === 409 && data.error === 'active_interview' && data.interviewId) {
              return {
                ok: true,
                interviewId: data.interviewId,
                preparing: data.resumeUrl?.includes('preparing') ?? false,
              };
            }
            if (res.status === 402) {
              return { ok: false, error: 'No credits remaining. Please upgrade your plan.' };
            }
            if (res.status === 503) {
              return {
                ok: false,
                error: data.error ?? 'AI is temporarily unavailable. Try again in 30 seconds.',
              };
            }
            return { ok: false, error: data.error ?? 'Failed to start interview. Please try again.' };
          }

          if (!data.interviewId) {
            return { ok: false, error: 'Failed to start interview. Please try again.' };
          }

          return {
            ok: true,
            interviewId: data.interviewId,
            preparing: data.preparing ?? false,
          };
        } catch {
          return { ok: false, error: 'Network error. Please check your connection and try again.' };
        }
      },
    });

    if (!result.ok) {
      setError(result.error ?? 'Failed to start interview. Please try again.');
      setLoading(false);
      return;
    }

    stashStartupClickMeta(result.interviewId!);
    const prep = result.preparing ? '?preparing=1' : '';
    router.push(`/interview/session/${result.interviewId!}${prep}`);
  }

  return (
    <>
      <DashboardPageHeader
        eyebrow="Practice"
        title="Start interview"
        subtitle="Configure your mock session. Starting uses 1 credit."
        backHref="/dashboard"
        backLabel="Dashboard"
      />

      <div className="dashboard-premium-card mx-auto max-w-lg space-y-6 p-6 sm:p-8">
      {/* Resume info */}
      <div
        className="rounded-xl border-2 p-4 text-sm"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
          color: 'var(--text-primary)',
        }}
      >
        <span className="font-semibold">Your resume:</span>{' '}
        <span style={{ color: 'var(--text-secondary)' }}>
          {resumeInfo.targetRole} · {resumeInfo.skillCount} skills · {resumeInfo.experienceEstimate}
        </span>
      </div>

      {/* Credits warning */}
      {creditsRemaining <= 1 && (
        <div
          className="rounded-xl border-2 p-3 text-sm font-medium"
          style={
            creditsRemaining === 0
              ? {
                  borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
                  color: 'var(--accent-danger)',
                }
              : {
                  borderColor: 'color-mix(in srgb, var(--accent-warning) 40%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-warning) 12%, transparent)',
                  color: 'var(--text-primary)',
                }
          }
        >
          {creditsRemaining === 0
            ? 'No credits remaining. Upgrade your plan to continue.'
            : 'Only 1 credit remaining. This interview will use your last credit.'}
        </div>
      )}

      {/* Interview mode toggle */}
      <div className="space-y-2">
        <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Interview type
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setInterviewMode('ai')}
            disabled={isDisabled}
            className={cn(
              'rounded-xl border-2 p-3 text-left text-sm font-medium transition-all duration-200',
              isDisabled && 'cursor-not-allowed opacity-50',
            )}
            style={
              interviewMode === 'ai'
                ? {
                    borderColor: 'var(--accent-primary)',
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                  }
                : {
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                    color: 'var(--text-secondary)',
                  }
            }
          >
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              AI-generated
            </p>
            <p className="mt-0.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              Custom questions from your resume
            </p>
          </button>
          <button
            type="button"
            onClick={() => isPro && setInterviewMode('domain_pack')}
            disabled={isDisabled || !isPro}
            className={cn(
              'relative rounded-xl border-2 p-3 text-left text-sm font-medium transition-all duration-200',
              (isDisabled || !isPro) && 'cursor-not-allowed opacity-50',
            )}
            style={
              interviewMode === 'domain_pack'
                ? {
                    borderColor: 'var(--accent-primary)',
                    background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                    color: 'var(--text-primary)',
                    boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 18%, transparent)',
                  }
                : {
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                    color: 'var(--text-secondary)',
                  }
            }
          >
            <div className="flex items-center gap-2">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Domain pack
              </p>
              {!isPro && (
                <Badge
                  className="border-0 text-xs"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-warning) 22%, transparent)',
                    color: 'var(--accent-warning)',
                  }}
                >
                  Pro
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
              DSA, System Design, or HR
            </p>
          </button>
        </div>
      </div>

      {/* AI mode: role input */}
      {interviewMode === 'ai' && (
        <div className="space-y-2">
          <Label htmlFor="role" className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Target role
          </Label>
          <Input
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Software Engineer"
            list="role-suggestions"
            disabled={isDisabled}
            className={cn(fieldClass, 'h-11 px-4')}
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
              color: 'var(--text-primary)',
            }}
          />
          <datalist id="role-suggestions">
            {ROLE_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      )}

      {/* Domain pack mode: pack selector */}
      {interviewMode === 'domain_pack' && (
        <div className="space-y-2">
          <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Select pack
          </Label>
          <div className="space-y-2">
            {domainPacks.map((pack) => (
              <button
                key={pack.id}
                type="button"
                onClick={() => setSelectedPackId(pack.id)}
                disabled={isDisabled}
                className={cn(
                  'w-full rounded-xl border-2 p-3 text-left text-sm transition-all duration-200',
                  isDisabled && 'cursor-not-allowed opacity-50',
                )}
                style={
                  selectedPackId === pack.id
                    ? {
                        borderColor: 'var(--accent-primary)',
                        background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                      }
                    : {
                        borderColor: 'var(--card-border)',
                        background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                      }
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {pack.name}
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {DOMAIN_LABELS[pack.domain] ?? pack.domain}
                  </span>
                </div>
                {pack.description && (
                  <p className="mt-1 line-clamp-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {pack.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty selector */}
      <div className="space-y-2">
        <Label className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Difficulty
        </Label>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <label
              key={d}
              className={cn(
                'flex-1 cursor-pointer rounded-xl border-2 p-3 text-center text-sm font-semibold transition-all duration-200',
                isDisabled && 'cursor-not-allowed opacity-50',
              )}
              style={
                difficulty === d
                  ? {
                      borderColor: 'var(--accent-primary)',
                      background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
                      color: 'var(--text-primary)',
                    }
                  : {
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
                      color: 'var(--text-secondary)',
                    }
              }
            >
              <input
                type="radio"
                name="difficulty"
                value={d}
                checked={difficulty === d}
                onChange={() => setDifficulty(d)}
                disabled={isDisabled}
                className="sr-only"
              />
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </label>
          ))}
        </div>
      </div>

      {error ? (
        <p
          className="rounded-xl border-2 px-4 py-3 text-sm font-medium"
          role="alert"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
            color: 'var(--accent-danger)',
          }}
        >
          {error}
        </p>
      ) : null}

      <Button
        className="landing-cta-lift h-12 w-full rounded-[14px] text-base font-semibold text-white sm:h-[3.25rem]"
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
          boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
        }}
        onClick={handleStart}
        disabled={!canSubmit}
        type="button"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {interviewMode === 'ai' ? 'Generating your questions...' : 'Loading pack questions...'}
          </span>
        ) : (
          'Start Interview (uses 1 credit)'
        )}
      </Button>
      </div>
    </>
  );
}
