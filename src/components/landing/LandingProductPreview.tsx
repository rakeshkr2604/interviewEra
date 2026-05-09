'use client';

import { motion, useReducedMotion } from 'motion/react';
import { AlertCircle, Mic, Sparkles } from 'lucide-react';

export function LandingProductPreview() {
  const reduce = useReducedMotion();

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
        <span
          className="rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] shadow-md"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 40%, transparent)',
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--text-primary)',
            boxShadow: '0 0 32px color-mix(in srgb, var(--accent-primary) 20%, transparent)',
          }}
        >
          Real session preview
        </span>
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          One screen · question → your answer → AI feedback → scores
        </span>
      </div>

      <motion.div
        className="overflow-hidden rounded-[24px] border-2 shadow-2xl"
        style={{
          borderColor: 'var(--card-border)',
          background: 'var(--card-bg)',
          boxShadow: 'var(--card-shadow), 0 24px 80px color-mix(in srgb, var(--text-primary) 8%, transparent)',
        }}
        initial={reduce ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-8%' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Window chrome */}
        <div
          className="flex items-center gap-2 border-b px-4 py-3 sm:px-6"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-4 text-[11px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
            InterviewEra · Session preview
          </span>
        </div>

        <div className="grid gap-0 lg:grid-cols-12">
          {/* Question */}
          <div
            className="border-b p-5 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              <Mic className="size-4" style={{ color: 'var(--accent-primary)' }} />
              Question
            </div>
            <p className="mt-4 text-base font-semibold leading-snug sm:text-lg" style={{ color: 'var(--text-primary)' }}>
              Describe a time you improved reliability in a system you built.
            </p>
            <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Pulled from your resume · not a generic bank
            </p>
          </div>

          {/* Answer */}
          <div
            className="border-b p-5 sm:p-6 lg:col-span-4 lg:border-b-0 lg:border-r"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Your answer
            </p>
            <div className="mt-4 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p>
                <span
                  className="rounded px-1 font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
                    color: 'var(--accent-success)',
                  }}
                >
                  S:
                </span>{' '}
                E‑commerce checkout; webhooks dropped under Diwali spike.
              </p>
              <p>
                <span
                  className="rounded px-1 font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
                    color: 'var(--accent-success)',
                  }}
                >
                  T:
                </span>{' '}
                I owned tracing failures without slipping the launch date.
              </p>
              <p>
                <span
                  className="rounded px-1 font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
                    color: 'var(--accent-success)',
                  }}
                >
                  A:
                </span>{' '}
                Idempotent handler, DLQ, alerts; k6 load tests pre-go-live.
              </p>
              <p>
                <span
                  className="rounded px-1 font-bold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-success) 18%, transparent)',
                    color: 'var(--accent-success)',
                  }}
                >
                  R:
                </span>{' '}
                99.2% delivery in test; zero P1s during sale.
              </p>
            </div>
          </div>

          {/* AI feedback */}
          <div
            className="border-b p-5 sm:p-6 lg:col-span-3 lg:border-b-0 lg:border-r"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-success) 10%, var(--card-bg))',
            }}
          >
            <div
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--accent-success)' }}
            >
              <Sparkles className="size-4" />
              AI feedback
            </div>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
              Strong STAR flow and metrics. Tighten queue semantics in one sentence — otherwise reads panel-ready.
            </p>
            <div
              className="mt-4 flex items-start gap-2 rounded-lg border p-3 text-xs"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-danger) 10%, var(--card-bg))',
                color: 'var(--text-secondary)',
              }}
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-danger)' }} />
              <span>Watch hedging words in the “Result” clause — panels penalise vague impact.</span>
            </div>
          </div>

          {/* Scores */}
          <div
            className="border-t p-5 sm:p-6 lg:col-span-2 lg:border-l lg:border-t-0"
            style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--bg-tertiary) 65%, var(--card-bg))' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Scores
            </p>
            <p
              className="mt-3 text-4xl font-extrabold tabular-nums"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-bricolage), sans-serif' }}
            >
              7.8
            </p>
            <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Session
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ['Structure', 88],
                ['Technical', 76],
                ['Confidence', 79],
              ].map(([label, pct]) => (
                <li key={String(label)}>
                  <div className="mb-1 flex justify-between text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    <span>{label}</span>
                    <span className="tabular-nums">{pct}%</span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--text-muted) 22%, var(--bg-tertiary))' }}
                  >
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-hover))',
                      }}
                      initial={reduce ? false : { width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
