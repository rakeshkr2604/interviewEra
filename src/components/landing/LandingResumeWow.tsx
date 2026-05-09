'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, BarChart3, FileText, Sparkles, Wand2 } from 'lucide-react';
import { RESUME_WOW } from '@/lib/landing/home-content';

function StepArrow({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ArrowRight className="mx-auto size-7 rotate-90 xl:rotate-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
    </div>
  );
}

export function LandingResumeWow() {
  const reduce = useReducedMotion();

  return (
    <div
      className="relative mx-auto w-full overflow-hidden rounded-[28px] border-2 p-6 sm:p-8 md:p-10"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, transparent)',
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 9%, var(--card-bg)) 0%, var(--card-bg) 45%, color-mix(in srgb, #7c3aed 6%, var(--card-bg)) 100%)',
        boxShadow:
          '0 0 80px color-mix(in srgb, var(--accent-primary) 16%, transparent), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(-12deg, var(--accent-primary) 0 1px, transparent 1px 14px)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl"
        style={{ background: 'color-mix(in srgb, #7c3aed 35%, transparent)' }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-stretch xl:gap-4">
        {/* Resume */}
        <motion.div
          className="flex-1 rounded-2xl border p-5 shadow-lg"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
            boxShadow: '0 0 40px color-mix(in srgb, var(--accent-primary) 12%, transparent)',
          }}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 items-center justify-center rounded-xl text-white"
              style={{ background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)' }}
            >
              <FileText className="size-5" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Resume in
              </p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                resume_final.pdf
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {[85, 100, 70, 55].map((w, i) => (
              <div key={i} className="h-2 rounded-full" style={{ background: 'var(--bg-tertiary)', width: `${w}%` }} />
            ))}
          </div>
        </motion.div>

        <StepArrow className="flex shrink-0 items-center justify-center py-1 xl:w-10" />

        {/* Topics */}
        <motion.div
          className="flex-1 rounded-2xl border p-5 shadow-lg"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)',
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            boxShadow: '0 0 36px color-mix(in srgb, var(--accent-primary) 20%, transparent)',
          }}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="size-5" style={{ color: 'var(--accent-primary)' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
              Extracted topics
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {RESUME_WOW.topics.map((t) => (
              <span
                key={t}
                className="rounded-full border px-2.5 py-1 text-[11px] font-bold"
                style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </motion.div>

        <StepArrow className="flex shrink-0 items-center justify-center py-1 xl:w-10" />

        {/* Questions */}
        <motion.div
          className="flex-1 rounded-2xl border p-5 shadow-lg"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
            boxShadow: '0 0 40px color-mix(in srgb, #7c3aed 14%, transparent)',
          }}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2">
            <Wand2 className="size-5" style={{ color: '#7c3aed' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
              Generated questions
            </p>
          </div>
          <ul className="mt-3 space-y-2">
            {RESUME_WOW.questions.map((q) => (
              <li
                key={q}
                className="rounded-xl border p-2.5 text-xs font-semibold leading-snug"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
              >
                {q}
              </li>
            ))}
          </ul>
        </motion.div>

        <StepArrow className="flex shrink-0 items-center justify-center py-1 xl:w-10" />

        {/* Scored answers — signature fourth beat */}
        <motion.div
          className="flex-1 rounded-2xl border-2 p-5 shadow-xl"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-success) 45%, transparent)',
            background:
              'linear-gradient(160deg, color-mix(in srgb, var(--accent-success) 12%, transparent), var(--card-bg))',
            boxShadow: '0 0 48px color-mix(in srgb, var(--accent-success) 18%, transparent)',
          }}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.14 }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5" style={{ color: 'var(--accent-success)' }} />
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
              Scored answers
            </p>
          </div>
          <p
            className="mt-3 text-3xl font-extrabold tabular-nums"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-bricolage), sans-serif' }}
          >
            7.4
            <span className="text-lg font-bold" style={{ color: 'var(--text-muted)' }}>
              /10
            </span>
          </p>
          <p className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            Session · after STAR fix
          </p>
          <div className="mt-4 space-y-2">
            {[
              { k: 'Structure', w: 86 },
              { k: 'Technical', w: 72 },
              { k: 'Confidence', w: 78 },
            ].map((row) => (
              <div key={row.k}>
                <div className="flex justify-between text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  <span>{row.k}</span>
                  <span className="tabular-nums">{row.w}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--bg-tertiary)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${row.w}%`,
                      background: 'linear-gradient(90deg, var(--accent-success), var(--accent-primary))',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <p className="relative mt-8 text-center text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent-primary)' }}>
        InterviewEra · resume-native pipeline
      </p>
    </div>
  );
}
