import type { Metadata } from 'next';
import Link from 'next/link';
import { generateMetadata } from '@/lib/seo/metadata';
import { canonicalUrl } from '@/lib/seo/site-url';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { planPriceLine } from '@/lib/pricing/copy';
import { TECHNICAL_ISSUE_FEEDBACK_HREF } from '@/lib/technical-failures/ux';

/** FAQ anchor page — canonical hub is /help-center (no duplicate indexing). */
const helpCanonical = canonicalUrl('/help-center');
export const metadata: Metadata = {
  ...generateMetadata({
    title: 'Frequently Asked Questions',
    description:
      'Answers to common questions about InterviewEra — credits, interview sessions, scoring, plans, and your account.',
    path: '/help',
    noIndex: true,
    noIndexFollow: true,
    keywords: ['InterviewEra FAQ', 'mock interview FAQ', 'interview credits', 'how it works'],
  }),
  ...(helpCanonical ? { alternates: { canonical: helpCanonical } } : {}),
};

// ─── FAQ data ──────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'getting-started',
    heading: 'Getting Started',
    faqs: [
      {
        q: 'What is InterviewEra?',
        a: 'InterviewEra is an AI-powered mock interview platform built for Indian students and early-career job seekers. You upload your resume, choose a target role and difficulty, and the AI generates questions from your actual projects and skills. Each answer is scored across five dimensions with specific, actionable feedback.',
      },
      {
        q: 'How does an interview session work?',
        a: 'After uploading your resume, you pick a role (e.g. "Software Engineer") and difficulty (Easy / Medium / Hard). The platform generates 6 personalised questions. You answer each one in the text box, submit, and receive a per-answer score plus an overall report at the end. The entire session takes 15–25 minutes.',
      },
      {
        q: 'Do I need to create an account?',
        a: 'Yes — a free account gives you 3 interview credits with no credit card required. Sign up with email/password or Google.',
      },
      {
        q: 'What browsers and devices are supported?',
        a: 'Any modern browser (Chrome, Firefox, Safari, Edge) on desktop or mobile. The avatar interview mode uses Web Speech API and works best on Chrome.',
      },
    ],
  },
  {
    id: 'credits-plans',
    heading: 'Credits & Plans',
    faqs: [
      {
        q: 'What is a credit?',
        a: (
          <span>
            One credit starts one mock interview session. Credits are deducted when you start an interview, not when you finish. A session that is started but left incomplete still uses that credit. If a technical issue prevents your interview from being completed, report it through{' '}
            <Link href={TECHNICAL_ISSUE_FEEDBACK_HREF} className="underline underline-offset-2">
              Feedback → Interview technical issue
            </Link>{' '}
            with details. Screenshots are optional but can help investigation. If the issue is confirmed after review, the interview credit may be restored.
          </span>
        ),
      },
      {
        q: 'How many free credits do I get?',
        a: '3 credits on sign-up, no card needed. Free credits never expire.',
      },
      {
        q: 'What are the paid plans?',
        a: (
          <span>
            <strong>Starter — {planPriceLine('starter')} (30-day access):</strong> 8 interview credits, full per-answer feedback, 30-day improvement roadmap, and detailed scores.
            <br />
            <strong>Pro — {planPriceLine('pro')} (30-day access):</strong> 25 interview credits, deeper analysis, model-answer comparison, PDF export, and replay.
            <br />
            <strong>Campus — contact us:</strong> Unlimited interviews for entire college batches with cohort-level analytics.
            <br />
            One-time payment — no auto-renewal. See <Link href="/pricing" className="underline underline-offset-2">Pricing</Link> for details.
          </span>
        ),
      },
      {
        q: 'Do plan credits roll over after 30 days?',
        a: 'No. Each Starter or Pro payment includes credits for that 30-day access period only. Unused credits do not carry over when access expires. Free credits (3 on sign-up) are lifetime and never expire.',
      },
      {
        q: 'Can I buy extra credits without upgrading my plan?',
        a: 'Not in the current version. Renew your plan for another 30-day period or upgrade from Starter to Pro when you need more credits.',
      },
    ],
  },
  {
    id: 'interviews',
    heading: 'Interviews',
    faqs: [
      {
        q: 'How many questions are in a session?',
        a: '6 questions per session by default (first session and all standard sessions). Questions are generated from your resume — 40% technical, 30% behavioural, 30% situational.',
      },
      {
        q: 'Can I pause or resume a session?',
        a: 'No — sessions run to completion without pause. If you close the tab mid-session the credit is already deducted and the partial session is saved. You can still view whatever answers were recorded.',
      },
      {
        q: 'What is the avatar interview mode?',
        a: 'Practice interviews use the scripted voice session at /interview/script/…. Your answers are scored after each turn, and you get a full report when you finish.',
      },
      {
        q: 'How are questions personalised to my resume?',
        a: 'When you upload your resume it is parsed once and the structured data (projects, skills, experience) is stored. Question generation uses that data, not a generic bank. Two users with different resumes applying for the same role will get different questions.',
      },
      {
        q: 'Can I retake the same interview?',
        a: 'Yes — each retake uses 1 credit and generates a fresh set of questions (shuffled from the cache for your resume + role combination).',
      },
    ],
  },
  {
    id: 'scoring',
    heading: 'Scoring & Reports',
    faqs: [
      {
        q: 'How is each answer scored?',
        a: (
          <span>
            Answers are rated 1–10 across five dimensions:
            <br />• <strong>Communication Clarity</strong> (20%) — sentence structure, conciseness, professional language
            <br />• <strong>Technical Depth</strong> (25%) — accuracy, correct terminology, depth of explanation
            <br />• <strong>Answer Structure</strong> (20%) — STAR method, logical flow
            <br />• <strong>Confidence</strong> (15%) — assertiveness, no excessive hedging
            <br />• <strong>Relevance</strong> (20%) — alignment to the question, use of relevant experience
            <br />
            The overall score is the weighted average.
          </span>
        ),
      },
      {
        q: 'What report features are plan-gated?',
        a: 'Free plans show overall scores and short per-answer feedback. Starter unlocks detailed feedback, dimension notes, hiring intelligence, and the 30-day improvement roadmap. Pro adds model-answer comparison, keyword analysis, PDF export, and interview replay. Campus plans follow your institution\'s contract.',
      },
      {
        q: 'Can I export my report as a PDF?',
        a: 'PDF export is available on the Pro and Campus plans.',
      },
      {
        q: 'Where can I see my score history?',
        a: 'The Analytics page (/analytics) shows your score trend across all completed sessions. The History page (/history) lists every session with links to individual reports.',
      },
    ],
  },
  {
    id: 'account-billing',
    heading: 'Account & Billing',
    faqs: [
      {
        q: 'How do I renew my plan?',
        a: 'Go to Settings → Billing and click "Renew plan", or visit the Upgrade page. Each payment is one-time — there is no auto-renewal. Renewal extends from your current expiry date and adds the new plan\'s credits to your remaining balance. UPI, cards, net banking, and wallets are supported via Razorpay.',
      },
      {
        q: 'What payment methods are accepted?',
        a: 'UPI, debit/credit cards, and netbanking via Razorpay. International cards are supported.',
      },
      {
        q: 'Can I get a refund?',
        a: (
          <span>
            Please read our{' '}
            <Link href="/refund" className="underline underline-offset-2">
              Refund Policy
            </Link>{' '}
            for full details. Credits that have been used are non-refundable.
          </span>
        ),
      },
      {
        q: 'How do I change my email or password?',
        a: 'Go to Settings → Account. Email changes require re-verification. Password resets can be triggered from the login page.',
      },
      {
        q: 'My question isn\'t answered here. How do I contact support?',
        a: (
          <span>
            Visit our{' '}
            <Link href="/contact" className="underline underline-offset-2">
              contact page
            </Link>
            . We aim to reply within one business day.
          </span>
        ),
      },
    ],
  },
] as const;

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <main id="main-content" className={`${LANDING_PAGE_CONTAINER} px-4 pb-16 pt-2.5 sm:px-5 sm:pb-20`}>
      {/* Header */}
      <div className="mb-12 max-w-2xl">
        <h1
          className="font-bricolage text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Frequently Asked Questions
        </h1>
        <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Quick answers to the most common questions. Browse the full{' '}
          <Link href="/help-center" className="font-medium underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}>
            Help Center
          </Link>{' '}
          or{' '}
          <Link
            href="/contact"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            contact us
          </Link>
          .
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-12">
        {SECTIONS.map((section) => (
          <section key={section.id} aria-labelledby={section.id}>
            <h2
              id={section.id}
              className="mb-4 text-lg font-semibold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {section.heading}
            </h2>

            <div
              className="divide-y divide-(--card-border) overflow-hidden rounded-xl border"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--bg-primary) 60%, transparent)',
              }}
            >
              {section.faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group"
                >
                  <summary
                    className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium select-none"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span>{faq.q}</span>
                    {/* Chevron via CSS rotate */}
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-open:rotate-45"
                      style={{
                        background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                        color: 'var(--accent-primary)',
                      }}
                      aria-hidden
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="size-3" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round">
                        <line x1="8" y1="2" x2="8" y2="14" />
                        <line x1="2" y1="8" x2="14" y2="8" />
                      </svg>
                    </span>
                  </summary>
                  <div
                    className="px-5 pb-5 pt-0 text-sm leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <div
        className="mt-16 rounded-2xl border px-6 py-8 text-center"
        style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--accent-primary) 5%, transparent)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Still have questions?
        </p>
        <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          We're one email away.
        </p>
        <Link
          href="/contact"
          className="landing-cta-lift mt-4 inline-flex h-10 items-center rounded-lg px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 14px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
          }}
        >
          Contact Support
        </Link>
      </div>
    </main>
  );
}
