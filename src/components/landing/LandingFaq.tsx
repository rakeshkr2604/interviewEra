import Link from 'next/link';
import { Plus } from 'lucide-react';
import { faqPageJsonLd } from '@/lib/seo/schema/jsonld';

/**
 * Homepage FAQ — native <details> accordion (SSR, zero client JS) + FAQPage JSON-LD.
 * Copy is keyword-aligned (AI mock interview, interview simulator, campus placement,
 * interview feedback, behavioural/technical practice) but written human-first.
 */

const FAQS = [
  {
    q: 'What is InterviewEra?',
    a: 'InterviewEra is a resume-aware AI mock interview platform for Indian campus placements and early-career roles. It runs a realistic interview simulator that adapts its questions to your answers and gives rubric-based feedback on each response.',
  },
  {
    q: 'How is this different from a question bank or a generic AI chat?',
    a: 'A question bank gives you a fixed list and leaves you to grade yourself. InterviewEra runs an adaptive interview: it reads each answer and asks the follow-up a real panel would, then scores you against a consistent rubric — so you practise the pressure, not just the questions.',
  },
  {
    q: 'Do I speak my answers or type them?',
    a: 'You speak them. InterviewEra is voice-first — you answer out loud the way you would in a real interview, with live captions running alongside so you can stay on track if you lose your thread.',
  },
  {
    q: 'How are my answers scored?',
    a: 'Every answer is scored across five weighted dimensions — communication clarity, technical depth, answer structure, confidence, and relevance — using the same rubric every session, with specific feedback on what to improve.',
  },
] as const;

export function LandingFaq() {
  const faqLd = faqPageJsonLd(FAQS.map((f) => ({ question: f.q, answer: f.a })));

  return (
    <section className="px-5 py-20 sm:py-24" aria-labelledby="home-faq-heading">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--accent-hover)' }}>
            Questions
          </span>
          <h2
            id="home-faq-heading"
            className="mt-3.5 text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            Common questions
          </h2>
        </div>

        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border-2 px-5 py-4"
              style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 75%, transparent)' }}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                {f.q}
                <Plus className="size-4 shrink-0 transition-transform group-open:rotate-45" style={{ color: 'var(--accent-primary)' }} aria-hidden />
              </summary>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          More questions? Browse the{' '}
          <Link href="/help-center" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            Help Center
          </Link>{' '}
          or{' '}
          <Link href="/how-it-works" className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
            see how it works
          </Link>
          .
        </p>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  );
}
