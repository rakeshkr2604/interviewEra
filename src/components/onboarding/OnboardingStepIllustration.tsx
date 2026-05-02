'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'

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
    title: 'Start strong — pick the lane you are training for',
    bullets: [
      'We calibrate tone and difficulty to fresher, job switch, promotion, or general reps.',
      'No wrong choice: run another round anytime. This one should match today’s goal.',
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
    title: 'Your resume is the blueprint — we build questions from it',
    bullets: [
      'Skills and projects become prompts that feel like a real screen, not generic trivia.',
      'PDF or TXT is fine; clear sections help us pull the right signal fast.',
    ],
  },
}

type Props = {
  step: number
}

export function OnboardingStepIllustration({ step }: Props) {
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
    <div className="flex w-full max-w-md flex-col items-center gap-3 sm:max-w-lg sm:gap-4 lg:max-w-none">
      <div className="relative flex w-full justify-center">
        <Image
          src={src}
          alt={alt}
          width={640}
          height={480}
          sizes="(max-width: 1024px) min(100vw - 2rem, 28rem), min(40vw, 36rem)"
          className="h-auto w-full max-w-[min(100%,20rem)] object-contain select-none sm:max-w-[min(100%,22rem)] lg:max-w-[min(100%,24rem)]"
          style={{ width: '100%', height: 'auto' }}
          priority={step === 1}
          onError={() => setBroken(true)}
        />
      </div>

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
    </div>
  )
}
