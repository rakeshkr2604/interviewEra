'use client'

import { useState } from 'react'
import {
  type LucideIcon,
  ChevronDown,
  Languages as LanguagesIcon,
  Gauge,
  TextQuote,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  STORAGE_KEYS,
  readDefaultDifficulty,
  readAnswerStyle,
  readInterviewLanguage,
  UPCOMING_INTERVIEW_LANGUAGE,
  type AnswerStyle,
  type InterviewLanguageCode,
} from '@/lib/settings/client-preferences'
import type { InterviewDifficulty } from '@/types/app.types'
import { cn } from '@/lib/utils'

const DIFFICULTY_OPTIONS: { value: InterviewDifficulty; label: string }[] = [
  { value: 'easy', label: 'Beginner' },
  { value: 'medium', label: 'Intermediate' },
  { value: 'hard', label: 'Advanced' },
]

const ANSWER_STYLE_OPTIONS: { value: AnswerStyle; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'detailed', label: 'Detailed' },
]

const selectClassName = cn(
  'w-full cursor-pointer appearance-none rounded-2xl border-2 px-4 py-2.5 pr-11 text-sm font-medium transition-all duration-200',
  'hover:border-[var(--accent-primary)]/28 focus-visible:border-[var(--accent-primary)]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/22',
  'bg-[color-mix(in_srgb,var(--card-bg)_76%,transparent)]',
  'text-[var(--text-primary)] border-[var(--card-border)]',
)

function SelectChevron() {
  return (
    <ChevronDown
      className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50"
      style={{ color: 'var(--text-muted)' }}
      aria-hidden
    />
  )
}

function SectionGroupLabel({ children }: { children: string }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.14em]"
      style={{ color: 'var(--accent-primary)' }}
    >
      {children}
    </p>
  )
}

function FieldHeader({
  icon: Icon,
  htmlFor,
  label,
}: {
  icon: LucideIcon
  htmlFor: string
  label: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--card-border)] bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] text-[var(--accent-primary)]"
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <Label htmlFor={htmlFor} className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {label}
      </Label>
    </div>
  )
}

export function InterviewPreferencesPanel() {
  const [interviewLanguage, setInterviewLanguage] = useState<InterviewLanguageCode>(() =>
    readInterviewLanguage(),
  )
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(() => readDefaultDifficulty())
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>(() => readAnswerStyle())

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <SectionGroupLabel>Defaults for new sessions</SectionGroupLabel>
        <div
          className="rounded-2xl border-2 p-4 sm:p-5"
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 40%, var(--bg-secondary))',
          }}
        >
          <div className="grid gap-5 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-4">
            <div className="space-y-3">
              <FieldHeader icon={LanguagesIcon} htmlFor="interview-lang" label="Interview language" />
              <div className="relative">
                <select
                  id="interview-lang"
                  value={interviewLanguage}
                  onChange={(e) => {
                    const v = e.target.value as InterviewLanguageCode
                    setInterviewLanguage(v)
                    localStorage.setItem(STORAGE_KEYS.interviewLanguage, v)
                  }}
                  className={selectClassName}
                >
                  <option value="en">English</option>
                  <option disabled value={UPCOMING_INTERVIEW_LANGUAGE.hinglish}>
                    Hindi–English mix (Hinglish) — coming soon
                  </option>
                </select>
                <SelectChevron />
              </div>
              <div
                className="flex flex-col gap-3 rounded-xl border-2 border-dashed px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
                }}
                role="note"
                aria-label="Hinglish language mode, coming soon"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                      Hindi–English (Hinglish)
                    </p>
                    <Badge
                      variant="secondary"
                      className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    >
                      Coming soon
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed sm:text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    Code-mixed questions and feedback for how many students actually interview. After English quality is
                    locked in.
                  </p>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Questions and scoring are optimized for English today.
              </p>
            </div>

            <div className="space-y-3">
              <FieldHeader icon={Gauge} htmlFor="pref-difficulty" label="Preferred difficulty" />
              <div className="relative">
                <select
                  id="pref-difficulty"
                  value={difficulty}
                  onChange={(e) => {
                    const v = e.target.value as InterviewDifficulty
                    setDifficulty(v)
                    localStorage.setItem(STORAGE_KEYS.defaultDifficulty, v)
                  }}
                  className={selectClassName}
                >
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <SelectChevron />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Default when you start a new practice interview. You can still override per session.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--card-border)] opacity-90" aria-hidden />

      <div className="space-y-3">
        <SectionGroupLabel>Answer shape</SectionGroupLabel>
        <div className="space-y-3">
          <FieldHeader icon={TextQuote} htmlFor="answer-style" label="Preferred answer style" />
          <div className="relative max-w-2xl">
            <select
              id="answer-style"
              value={answerStyle}
              onChange={(e) => {
                const v = e.target.value as AnswerStyle
                setAnswerStyle(v)
                localStorage.setItem(STORAGE_KEYS.answerStyle, v)
              }}
              className={selectClassName}
            >
              {ANSWER_STYLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium sm:text-xs" style={{ color: 'var(--text-muted)' }}>
            <span
              className="rounded-full border px-2.5 py-1"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              Concise — short, interview-clock friendly
            </span>
            <span
              className="rounded-full border px-2.5 py-1"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              Balanced — structure + depth
            </span>
            <span
              className="rounded-full border px-2.5 py-1"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              Detailed — fuller explanations
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Applied when your answers are scored — concise vs detailed expectations, without changing the core rubric.
          </p>
        </div>
      </div>

      <div className="h-px bg-[var(--card-border)] opacity-90" aria-hidden />

      <div className="space-y-3">
        <SectionGroupLabel>Session behavior</SectionGroupLabel>
        <div
          className="rounded-2xl border-2 px-3.5 py-3 sm:px-4"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Progress is saved when you submit
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Each answer is written to your account immediately. You can close the tab and reopen the interview — you
            resume at the next unanswered question. There is nothing extra to turn on.
          </p>
        </div>
        <div
          className="flex flex-col gap-2 rounded-2xl border-2 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Follow-up questioning
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Extra drill-down prompts after your main answer are not generated yet — interviews use a fixed question
              list today.
            </p>
          </div>
          <Badge variant="secondary" className="w-fit shrink-0">
            Coming soon
          </Badge>
        </div>
      </div>
    </div>
  )
}
