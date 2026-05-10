'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Step art in public/onboarding/ */
const STEP_SRC: Record<number, string> = {
  1: '/onboarding/step-goal.png',
  2: '/onboarding/step-details.png',
  3: '/onboarding/step-resume.png',
}

const STEP_ALT: Record<number, string> = {
  1: 'Illustration: choosing your interview goal and career path',
  2: 'Illustration: your role, experience, and interview mode',
  3: 'Illustration: uploading and reviewing your resume',
}

/** Encouraging copy beside the art — high signal, high energy */
const STEP_COPY: Record<number, { title: string; bullets: string[] }> = {
  1: {
    title: 'Goal first — then role and style on the next beat',
    bullets: [
      'We calibrate the session to what you are practicing for today.',
      'Voice and language stay in sync with Settings unless you change them here.',
    ],
  },
  2: {
    title: 'Dial in your session — then bring your A-game',
    bullets: [
      'Role and experience set how deep we go and how “senior” your answers should sound — that is your unfair advantage.',
      'Technical doubles down on stack and problem-solving; HR / Behavioral on stories, empathy, and presence.',
    ],
  },
  3: {
    title: 'One upload — questions that feel like a real screen',
    bullets: [
      'Skills and projects become prompts tied to your CV.',
      'JD is optional; skip it for a fast repeat run.',
    ],
  },
}

type Props = {
  step: number
  /** Shorter art + no copy card — saves height beside the form on desktop */
  compact?: boolean
}

export function OnboardingStepIllustration({ step, compact = false }: Props) {
  const [broken, setBroken] = useState(false)
  const src = STEP_SRC[step] ?? STEP_SRC[1]
  const alt = STEP_ALT[step] ?? STEP_ALT[1]
  const copy = STEP_COPY[step] ?? STEP_COPY[1]
  const headingId = `onboarding-art-copy-${step}`

  if (broken) {
    return (
      <div
        className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-3xl border border-(--card-border) bg-gradient-to-br from-violet-500/[0.12] via-transparent to-indigo-500/[0.08] p-6 sm:min-h-[240px] sm:p-8 lg:min-h-[280px]"
        aria-hidden
      >
        <Sparkles className="h-10 w-10 text-(--accent-primary)/40 sm:h-12 sm:w-12" strokeWidth={1.25} />
        <p className="max-w-[14rem] text-center text-xs text-(--text-muted)">
          Add illustrations to{' '}
          <code className="rounded bg-(--bg-secondary) px-1 py-0.5 text-[0.65rem]">
            public/onboarding/
          </code>
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-md flex-col items-center gap-3 sm:max-w-lg sm:gap-4 lg:max-w-none',
        compact && 'gap-2 lg:gap-2',
      )}
    >
      <div className="relative flex w-full justify-center">
        <Image
          src={src}
          alt={alt}
          width={640}
          height={480}
          sizes={compact ? '(max-width: 1024px) min(100vw - 2rem, 28rem), 14rem' : '(max-width: 1024px) min(100vw - 2rem, 28rem), min(40vw, 36rem)'}
          className={cn(
            'h-auto w-full object-contain select-none',
            compact
              ? 'max-w-[min(100%,17rem)] sm:max-w-[min(100%,19rem)] lg:max-w-[13rem]'
              : 'max-w-[min(100%,20rem)] sm:max-w-[min(100%,22rem)] lg:max-w-[min(100%,24rem)]',
          )}
          style={{ width: '100%', height: 'auto' }}
          priority={step === 1}
          onError={() => setBroken(true)}
        />
      </div>

      {compact ? null : (
        <section
          className="w-full rounded-2xl border border-(--card-border) border-l-[3px] border-l-(--accent-primary)/50 bg-(--bg-secondary)/90 px-4 py-3.5 shadow-sm sm:px-5 sm:py-4"
          aria-labelledby={headingId}
        >
          <h2
            id={headingId}
            className="text-base font-semibold leading-snug text-(--text-primary)"
          >
            {copy.title}
          </h2>
          <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-(--text-secondary)">
            {copy.bullets.map(line => (
              <li key={line} className="flex gap-2.5">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--accent-primary)"
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
