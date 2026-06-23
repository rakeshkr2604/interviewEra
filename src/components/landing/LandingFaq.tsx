import Link from 'next/link';
import { Minus, Plus, ChevronDown } from 'lucide-react';
import { faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { cn } from '@/lib/utils';

/** FAQs shown before the “Show more” expander */
export const LANDING_FAQ_VISIBLE_COUNT = 6;

export const LANDING_FAQS = [
  {
    q: 'What is InterviewEra?',
    a: 'InterviewEra is a resume-aware AI mock interview platform built for Indian campus placements and early-career hiring. You upload your resume, sit a realistic voice-based interview, and get rubric-scored feedback on every answer — not a generic chat or static question list.',
  },
  {
    q: 'Who is InterviewEra for?',
    a: 'Final-year students, freshers, and early professionals preparing for campus drives, off-campus hiring, internships, and service/product company interviews. If you want structured practice with measurable scores, it is built for you.',
  },
  {
    q: 'Is it free to start?',
    a: 'Yes. You can sign up and run scored mock interviews on the free tier without a credit card. Paid plans add more credits and deeper report access when you need more volume — see pricing for current limits.',
  },
  {
    q: 'How is this different from a question bank or a generic AI chat?',
    a: 'A question bank gives you a fixed list and leaves you to grade yourself. ChatGPT answers prompts but does not run a structured panel simulation. InterviewEra adapts follow-ups from your resume and prior answers, then scores you on a consistent five-dimension rubric — so you practise interview pressure, not isolated Q&A.',
  },
  {
    q: 'Do I speak my answers or type them?',
    a: 'You speak them. InterviewEra is voice-first: you answer out loud as in a real interview, with live captions so you can stay on track if you lose your thread.',
  },
  {
    q: 'How are my answers scored?',
    a: 'Every answer is scored across five weighted dimensions — communication clarity, technical depth, answer structure (STAR-style), confidence, and relevance — using the same rubric every session, with specific pointers on what to fix next.',
  },
  {
    q: 'Do I need to upload my resume?',
    a: 'Yes — for the full experience. Your resume drives role-aware questions and follow-ups tied to your projects, skills, and experience. Without it, the interview cannot mirror what a real panel would probe.',
  },
  {
    q: 'What roles and interview types are supported?',
    a: 'Software engineering, data, product, and other early-career roles common in Indian campus hiring — with technical, behavioural, and situational questions. Difficulty adapts to your profile and how you answer in the session.',
  },
  {
    q: 'How do credits and pricing work?',
    a: 'One credit typically covers one mock interview session. Free users get starter credits; paid plans are one-time purchases for 30-day access with more credits. Credits deduct when a session starts — not when you sign up.',
  },
  {
    q: 'Can I use this for campus placement and off-campus interviews?',
    a: 'Yes. The same simulator works for T&P season campus drives, internship loops, and off-campus applications. Your resume and target role shape the question mix either way.',
  },
  {
    q: 'Is my interview data private?',
    a: 'Your sessions, answers, and reports are tied to your account and are not published publicly. We do not use your resume or transcripts to train third-party models. See our Privacy Policy for full details.',
  },
  {
    q: 'How do I join the InterviewEra community?',
    a: 'WhatsApp groups, job-alert channels, and social links for daily placement tips and peer discussions.',
  },
] as const;

const COMMUNITY_FAQ_Q = 'How do I join the InterviewEra community?';

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (question === COMMUNITY_FAQ_Q) {
    return (
      <>
        See the{' '}
        <Link
          href={COMMUNITY_HUB_PATH}
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          Community Hub
        </Link>{' '}
        for WhatsApp groups, job-alert channels, and social links.
      </>
    );
  }
  return <>{answer}</>;
}

function FaqItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={cn(
        'group rounded-2xl border px-4 py-3.5 transition-all duration-200 sm:px-5 sm:py-4',
        'hover:border-[color-mix(in_srgb,var(--accent-primary)_28%,var(--card-border))]',
        'open:border-[color-mix(in_srgb,var(--accent-primary)_35%,var(--card-border))]',
        'open:bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--card-bg))]',
        'open:shadow-[0_8px_32px_color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
      )}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
      }}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-[15px] font-semibold leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:ring-offset-2"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="min-w-0 pr-2">{question}</span>
        <span
          className="relative flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors group-open:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))] group-open:bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]"
          style={{ borderColor: 'var(--card-border)' }}
        >
          <Plus
            className="size-3.5 transition-all duration-200 group-open:scale-0 group-open:opacity-0"
            style={{ color: 'var(--accent-primary)' }}
            aria-hidden
          />
          <Minus
            className="absolute size-3.5 scale-0 opacity-0 transition-all duration-200 group-open:scale-100 group-open:opacity-100"
            style={{ color: 'var(--accent-primary)' }}
            aria-hidden
          />
        </span>
      </summary>
      <p
        className="mt-3 border-t pt-3 text-sm leading-relaxed sm:text-[15px]"
        style={{
          color: 'var(--text-secondary)',
          borderColor: 'color-mix(in srgb, var(--card-border) 70%, transparent)',
        }}
      >
        <FaqAnswer question={question} answer={answer} />
      </p>
    </details>
  );
}

/**
 * Homepage FAQ — native <details> accordion (SSR, zero client JS) + FAQPage JSON-LD.
 * First {LANDING_FAQ_VISIBLE_COUNT} items visible; rest behind a “Show more” expander.
 */
export function LandingFaq() {
  const faqLd = faqPageJsonLd(LANDING_FAQS.map((f) => ({ question: f.q, answer: f.a })));
  const visibleFaqs = LANDING_FAQS.slice(0, LANDING_FAQ_VISIBLE_COUNT);
  const moreFaqs = LANDING_FAQS.slice(LANDING_FAQ_VISIBLE_COUNT);
  const moreCount = moreFaqs.length;

  return (
    <section
      className="border-t px-5 py-20 sm:py-24"
      style={{
        borderColor: 'color-mix(in srgb, var(--card-border) 80%, transparent)',
        background: 'color-mix(in srgb, var(--bg-secondary) 40%, transparent)',
      }}
      aria-labelledby="home-faq-heading"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span
            className="text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--accent-hover)' }}
          >
            Questions
          </span>
          <h2
            id="home-faq-heading"
            className="mt-3 font-[family-name:var(--font-bricolage)] text-[clamp(1.625rem,3.4vw,2.5rem)] font-extrabold leading-tight tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Common questions
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Everything you need to know before your first scored mock — product, scoring, pricing,
            privacy, and community.
          </p>
        </div>

        <div className="mt-10 space-y-2.5 sm:space-y-3">
          {visibleFaqs.map((f, index) => (
            <FaqItem key={f.q} question={f.q} answer={f.a} defaultOpen={index === 0} />
          ))}

          {moreCount > 0 ? (
            <details
              className="group/more rounded-2xl border border-dashed transition-colors duration-200 open:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))]"
              style={{
                borderColor: 'color-mix(in srgb, var(--card-border) 90%, transparent)',
                background: 'color-mix(in srgb, var(--card-bg) 50%, transparent)',
              }}
            >
              <summary
                className="flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:ring-offset-2 sm:py-4"
                style={{ color: 'var(--accent-primary)' }}
              >
                <span className="group-open/more:hidden">
                  Show {moreCount} more question{moreCount === 1 ? '' : 's'}
                </span>
                <span className="hidden group-open/more:inline">Show fewer questions</span>
                <ChevronDown
                  className="size-4 transition-transform duration-200 group-open/more:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="space-y-2.5 border-t px-3 pb-3 pt-2 sm:space-y-3 sm:px-4 sm:pb-4 sm:pt-3" style={{ borderColor: 'var(--card-border)' }}>
                {moreFaqs.map((f) => (
                  <FaqItem key={f.q} question={f.q} answer={f.a} />
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div
          className="mt-10 rounded-2xl border px-5 py-4 text-center text-sm sm:px-6"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-primary) 18%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
            color: 'var(--text-secondary)',
          }}
        >
          Still have questions?{' '}
          <Link
            href="/help-center"
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Help Center
          </Link>
          ,{' '}
          <Link
            href="/how-it-works"
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            how it works
          </Link>
          , or{' '}
          <Link
            href={COMMUNITY_HUB_PATH}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            community
          </Link>
          .
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  );
}
