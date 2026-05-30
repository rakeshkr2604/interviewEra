'use client'

import { useState, useMemo, useId } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { GoalSelector } from '@/components/onboarding/GoalSelector'
import { InterviewerPicker } from '@/components/onboarding/InterviewerPicker'
import { ROLE_QUICK_PICKS } from '@/lib/onboarding/role-quick-picks'
import type { InterviewGoal, OnboardingData } from '@/types/onboarding.types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Brain, Target, Sparkles, Mic2, ChevronRight, Briefcase } from 'lucide-react'

const INTERVIEW_MODES: OnboardingData['mode'][] = ['Technical', 'HR', 'Mixed']

const MODE_DESCRIPTIONS: Record<OnboardingData['mode'], string> = {
  Technical: 'Backend, frontend, databases, scalability, architecture.',
  HR: 'Behavioral, communication, leadership, confidence.',
  Mixed: 'Realistic blend — ~70% technical, 30% behavioral.',
}

const ROLE_MODE_HINTS: Array<{ pattern: RegExp; mode: OnboardingData['mode'] }> = [
  {
    pattern:
      /backend|frontend|full.?stack|devops|swe\b|sde\b|software|data\s*(engineer|scientist)|ml\b|machine\s*learn|cloud|infra|platform|android|ios|mobile/i,
    mode: 'Technical',
  },
  { pattern: /hr\b|human\s*res|people\s*ops|recruiter|talent\s*acq/i, mode: 'HR' },
  {
    pattern: /product\s*man|pm\b|business\s*analyst|ui.?ux|designer|growth|marketing/i,
    mode: 'Mixed',
  },
]

const BENEFITS: Array<{ icon: LucideIcon; title: string; desc: string }> = [
  {
    icon: Brain,
    title: 'AI-calibrated questions',
    desc: 'Every question adapts to your exact role and experience level.',
  },
  {
    icon: Target,
    title: 'Dimension-based scoring',
    desc: 'Evaluated across 5 hiring dimensions — not just keywords.',
  },
  {
    icon: Mic2,
    title: 'Voice + filler analysis',
    desc: 'Real-time speech patterns and confidence scoring.',
  },
]

export interface OnboardingStepGoalProfileProps {
  goal: OnboardingData['goal']
  role: OnboardingData['role']
  experienceYears: OnboardingData['experienceYears']
  mode: OnboardingData['mode']
  interviewerId: OnboardingData['interviewerId']
  onGoalSelect: (goal: InterviewGoal) => void
  onRoleChange: (role: string) => void
  onExperienceYearsChange: (years: number) => void
  onModeChange: (mode: OnboardingData['mode']) => void
  onInterviewerSelect: (id: NonNullable<OnboardingData['interviewerId']>) => void
  /** Resolved display name for the selected interviewer. */
  interviewerDisplayName: string
  /** True when session voice matches the user's saved Settings default. */
  voiceMatchesSettingsDefault: boolean
  onResetVoiceToSettings: () => void
  canContinue: boolean
  onContinue: () => void
}

export function OnboardingStepGoalProfile({
  goal,
  role,
  experienceYears,
  mode,
  interviewerId,
  onGoalSelect,
  onRoleChange,
  onExperienceYearsChange,
  onModeChange,
  onInterviewerSelect,
  interviewerDisplayName,
  voiceMatchesSettingsDefault,
  onResetVoiceToSettings,
  canContinue,
  onContinue,
}: OnboardingStepGoalProfileProps) {
  const [voicePickerOpen, setVoicePickerOpen] = useState(false)
  const pillId = useId()

  // Derived during render — no effect needed. Avoids an extra render cycle and
  // the set-state-in-effect lint error.
  const suggestedMode = useMemo<OnboardingData['mode'] | null>(() => {
    if (!role.trim()) return null
    for (const hint of ROLE_MODE_HINTS) {
      if (hint.pattern.test(role)) return hint.mode !== mode ? hint.mode : null
    }
    return null
  }, [role, mode])

  return (
    <div className="grid grid-cols-1 gap-4 max-lg:flex-none lg:min-h-0 lg:flex-1 lg:grid-cols-[5fr_7fr] lg:items-stretch">

      {/* ── Left: Brand Panel (desktop only) ──────────────────────────────── */}
      <div
        className="relative hidden overflow-hidden rounded-2xl border border-(--card-border)/60 lg:flex lg:flex-col lg:justify-center lg:px-6 lg:py-8"
        style={{ background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)' }}
      >
        {/* Decorative radial glow — top-right */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 35%, transparent), transparent 70%)',
          }}
        />

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative space-y-5"
        >
          {/* AI label */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-primary)/30 bg-(--accent-primary)/10 px-3 py-1 text-[11px] font-semibold text-(--accent-primary)">
            <Sparkles className="size-3" aria-hidden />
            AI Interview Training
          </div>

          {/* Headline */}
          <div className="space-y-1.5">
            <h1 className="text-[1.45rem] font-bold leading-[1.2] text-(--text-primary) xl:text-[1.65rem]">
              Set your interview
              <br />
              <span style={{ color: 'var(--accent-primary)' }}>focus.</span>
            </h1>
            <p className="text-[13px] leading-relaxed text-(--text-secondary)">
              Your answers shape every question, tone, and evaluation this session.
            </p>
          </div>

          {/* Benefits list */}
          <div className="space-y-3.5">
            {BENEFITS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3">
                <div
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-(--accent-primary)/25"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}
                >
                  <Icon className="size-4 text-(--accent-primary)" aria-hidden />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-(--text-primary)">{title}</p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-(--text-secondary)">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* North-star stat */}
          <div
            className="overflow-hidden rounded-xl border border-(--accent-primary)/20"
            style={{ background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--card-bg))' }}
          >
            <div
              className="h-[3px] w-full"
              style={{ background: 'var(--accent-primary)' }}
            />
            <div className="px-4 py-3">
              <p className="text-2xl font-bold text-(--text-primary)">
                4<span style={{ color: 'var(--accent-primary)' }}>+</span>
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-(--text-secondary)">
                interviews completed per user in first 14 days
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Right: Form Card ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex min-h-0 flex-col"
      >
        <div className="dashboard-premium-card flex flex-col max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden">

          {/* Mobile-only inline header */}
          <div className="shrink-0 border-b border-(--card-border) px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-(--accent-primary)/10">
                <Sparkles className="size-3.5 text-(--accent-primary)" aria-hidden />
              </div>
              <h2 className="text-sm font-semibold text-(--text-primary)">
                Set your interview focus
              </h2>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-(--text-muted)">
              Shapes every question, tone, and scoring for this session only.
            </p>
          </div>

          {/* Scrollable form */}
          <div className="p-4 sm:p-5 max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain">
            <div className="space-y-5">

              {/* Goal */}
              <section aria-label="Interview goal">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  Interview goal
                </p>
                <GoalSelector dense selected={goal} onSelect={onGoalSelect} />
              </section>

              {/* Target role */}
              <section aria-label="Target role">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  Target role
                </p>
                <div className="relative">
                  <Briefcase
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)"
                    aria-hidden
                  />
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={role}
                    onChange={(e) => onRoleChange(e.target.value)}
                    className={cn(
                      'w-full rounded-xl border border-(--card-border) bg-(--bg-secondary)',
                      'py-2.5 pl-10 pr-4 text-sm text-(--text-primary)',
                      'placeholder:text-(--text-muted) transition-all duration-200',
                      'focus:border-(--accent-primary) focus:outline-none',
                      'focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]',
                    )}
                    aria-label="Target role"
                  />
                </div>

                {/* Quick-pick role chips — horizontal scroll, no wrap */}
                <div
                  className="ie-scroll-x mt-2 flex gap-1.5 overflow-x-auto pb-0.5"
                  role="group"
                  aria-label="Suggested roles"
                >
                  {ROLE_QUICK_PICKS.map((pick, i) => (
                    <motion.button
                      key={pick}
                      type="button"
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.028, duration: 0.22, ease: 'easeOut' }}
                      onClick={() => onRoleChange(pick)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-150',
                        role === pick
                          ? 'border-(--accent-primary) bg-(--accent-primary)/12 text-(--accent-primary)'
                          : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary) hover:border-(--accent-primary)/50 hover:text-(--text-primary)',
                      )}
                    >
                      {pick}
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* Experience + Mode row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                {/* Years of experience */}
                <section aria-label="Years of experience">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    Experience
                  </p>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={60}
                      placeholder="0"
                      value={experienceYears}
                      onChange={(e) =>
                        onExperienceYearsChange(Number.parseInt(e.target.value, 10) || 0)
                      }
                      className={cn(
                        'input-no-spin w-full rounded-xl border border-(--card-border) bg-(--bg-secondary)',
                        'px-4 py-2.5 pr-10 text-sm text-(--text-primary)',
                        'placeholder:text-(--text-muted) transition-all duration-200',
                        'focus:border-(--accent-primary) focus:outline-none',
                        'focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]',
                      )}
                      aria-label="Years of experience"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-(--text-muted)">
                      yrs
                    </span>
                  </div>
                </section>

                {/* Interview mode segmented control */}
                <section aria-label="Interview mode">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                    Interview type
                  </p>
                  <div
                    className="flex items-stretch rounded-full border border-(--card-border) bg-(--bg-secondary) p-[3px]"
                    role="group"
                    aria-label="Interview mode"
                  >
                    {INTERVIEW_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        aria-pressed={mode === m}
                        onClick={() => onModeChange(m)}
                        className="relative flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold"
                      >
                        {mode === m && (
                          <motion.div
                            layoutId={`${pillId}-mode-pill`}
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: 'var(--accent-primary)',
                              boxShadow: '0 2px 10px rgba(99,102,241,0.45)',
                            }}
                            transition={{ type: 'spring', stiffness: 480, damping: 38 }}
                          />
                        )}
                        <span
                          className={cn(
                            'relative z-10 transition-colors duration-100',
                            mode === m ? 'text-white' : 'text-(--text-secondary)',
                          )}
                        >
                          {m}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-(--text-muted)">
                    {MODE_DESCRIPTIONS[mode]}
                  </p>
                </section>
              </div>

              {/* Smart mode suggestion */}
              <AnimatePresence>
                {suggestedMode && (
                  <motion.div
                    key="mode-hint"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.22 }}
                    className="flex items-center gap-2.5 rounded-xl border border-(--accent-primary)/20 bg-(--accent-primary)/8 px-3 py-2.5"
                  >
                    <Sparkles className="size-3.5 shrink-0 text-(--accent-primary)" aria-hidden />
                    <p className="flex-1 text-[11px] text-(--text-secondary)">
                      <span className="font-semibold text-(--text-primary)">{suggestedMode}</span>{' '}
                      mode might fit your role better.
                    </p>
                    <button
                      type="button"
                      onClick={() => onModeChange(suggestedMode)}
                      className="shrink-0 rounded-lg border border-(--accent-primary)/30 bg-(--accent-primary)/12 px-2.5 py-1 text-[10px] font-semibold text-(--accent-primary) transition-colors hover:bg-(--accent-primary)/20"
                    >
                      Apply
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Interviewer voice */}
              <section aria-label="Interviewer voice">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  Interviewer voice
                </p>
                <div
                  className="flex items-center justify-between rounded-xl border border-(--card-border) px-4 py-3"
                  style={{ background: 'color-mix(in srgb, var(--bg-secondary) 60%, transparent)' }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-(--text-primary)">{interviewerDisplayName}</p>
                    <p className="mt-0.5 text-[11px] text-(--text-muted)">
                      {voiceMatchesSettingsDefault
                        ? 'From your Settings default'
                        : 'This session only'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!voiceMatchesSettingsDefault && (
                      <button
                        type="button"
                        onClick={() => {
                          onResetVoiceToSettings()
                          setVoicePickerOpen(false)
                        }}
                        className="rounded-lg border border-(--card-border) bg-(--card-bg) px-2.5 py-1.5 text-[11px] font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                      >
                        Reset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setVoicePickerOpen(true)}
                      className="rounded-lg border border-(--accent-primary)/30 bg-(--accent-primary)/10 px-2.5 py-1.5 text-[11px] font-semibold text-(--accent-primary) transition-colors hover:bg-(--accent-primary)/20"
                    >
                      Change
                    </button>
                  </div>
                </div>
              </section>

            </div>
          </div>

          {/* Footer: status + CTA */}
          <div className="flex shrink-0 items-center justify-between border-t border-(--card-border) px-4 py-3 sm:px-5">
            <p className="text-[11px] text-(--text-muted)">
              {goal ? (
                <span className="text-(--accent-success)">✓ Goal selected</span>
              ) : (
                'Select a goal above to continue'
              )}
            </p>
            <motion.button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              whileHover={canContinue ? { scale: 1.02 } : undefined}
              whileTap={canContinue ? { scale: 0.97 } : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200',
                canContinue
                  ? 'bg-(--accent-primary) hover:bg-(--accent-hover) shadow-[0_4px_18px_rgba(99,102,241,0.45)]'
                  : 'cursor-not-allowed bg-(--accent-primary)/40 shadow-none',
              )}
            >
              Continue
              <ChevronRight className="size-4" aria-hidden />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Voice picker dialog */}
      <Dialog open={voicePickerOpen} onOpenChange={setVoicePickerOpen}>
        <DialogContent
          className="flex max-h-[min(85dvh,36rem)] max-w-[calc(100%-2rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-md"
          showCloseButton
        >
          <DialogHeader className="shrink-0 text-left">
            <DialogTitle className="text-(--text-primary)">Choose interviewer voice</DialogTitle>
            <DialogDescription className="text-(--text-secondary)">
              Preview a voice, then tap your choice. This applies to this interview only unless it
              matches Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1">
            <InterviewerPicker
              selectedId={interviewerId}
              onSelect={(id) => {
                onInterviewerSelect(id)
                setVoicePickerOpen(false)
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
