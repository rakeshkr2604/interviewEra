import type { Metadata } from 'next';
import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Refund Policy — InterviewEra',
  description:
    'Understand InterviewEra\'s refund and cancellation policy for subscriptions and credits.',
};

const POLICY_HIGHLIGHTS = [
  { label: 'Credit refunds', value: 'Technical issues only' },
  { label: 'Monthly plan cancellation', value: 'Anytime — no penalty' },
  { label: 'Annual plan refund window', value: '7 days from purchase' },
  { label: 'Pro-rated refunds', value: 'Not applicable' },
  { label: 'Response time', value: 'Within 5 business days' },
] as const;

const SECTIONS = [
  {
    id: 'credits',
    title: '1. Credit Policy',
    content: [
      {
        sub: 'When Credits Are Deducted',
        text: 'One credit is consumed when you start a mock interview session. Credits are deducted at session start, not on completion. A session that is started but abandoned still uses the credit.',
      },
      {
        sub: 'Credit Refunds',
        text: 'Credits are generally non-refundable once consumed. However, if a session fails to generate questions or encounters a critical technical error on our side (e.g., AI service outage, data loss), we will restore the credit to your account upon verification. To request a credit refund, email support@interviewera.com with your account email and the session date.',
      },
      {
        sub: 'Free Credits',
        text: 'The 5 lifetime free credits cannot be refunded or transferred. Unused free credits do not carry over if you delete your account.',
      },
    ],
  },
  {
    id: 'subscriptions',
    title: '2. Subscription Cancellation',
    content: [
      {
        sub: 'Monthly Plans (Starter & Pro)',
        text: 'You may cancel your monthly subscription at any time from Account Settings → Subscription. Cancellation takes effect at the end of the current billing period. You retain full access to your plan benefits until that date. Monthly plans are not eligible for pro-rated refunds.',
      },
      {
        sub: 'Annual Plans',
        text: 'Annual plans may be cancelled within 7 days of purchase for a full refund, provided you have used fewer than 5 interview credits on the plan. After 7 days, annual subscriptions are non-refundable for the remaining term. Cancelling an annual plan stops auto-renewal; you retain access until the subscription end date.',
      },
      {
        sub: 'How to Cancel',
        text: 'Log in → go to Settings → Subscription → Cancel Plan. Alternatively, email support@interviewera.com. Cancellations are processed within 24 hours and you will receive a confirmation email.',
      },
    ],
  },
  {
    id: 'prorated',
    title: '3. Pro-Rated Refunds',
    text: 'We do not offer pro-rated refunds for partial months or unused credits on paid plans. For example, if you upgrade to Pro and use 10 credits, you will not receive a partial refund for the remaining 20 credits if you cancel. The exception is the 7-day full refund window for annual plans described above.',
  },
  {
    id: 'technical',
    title: '4. Refunds for Technical Issues',
    text: 'If you experience a billing error (e.g., charged twice, wrong amount), or if the Service is unavailable for more than 24 consecutive hours within a billing period due to issues on our end, you are entitled to a refund or credit equivalent to the affected period. Please contact us within 30 days of the issue.',
    bullets: [
      'Duplicate charge: full refund of the duplicate amount',
      'Service outage > 24 hours: pro-rated credit for the outage duration',
      'Failed session due to our AI system error: credit restored to your account',
    ],
  },
  {
    id: 'process',
    title: '5. Refund Process',
    content: [
      {
        sub: 'Requesting a Refund',
        text: 'Email support@interviewera.com with your registered email address, the order or transaction ID (from your billing receipt), the reason for the refund request, and any relevant screenshots or error details.',
      },
      {
        sub: 'Processing Time',
        text: 'We will review your request and respond within 5 business days. Approved refunds are processed within 7–10 business days and credited to the original payment method (credit/debit card or bank account). UPI refunds typically arrive within 2–3 business days.',
      },
      {
        sub: 'Currency',
        text: 'All refunds are issued in Indian Rupees (INR). If your card was charged in a different currency due to bank conversion, the refund amount in INR may differ from the amount shown on your statement.',
      },
    ],
  },
  {
    id: 'campus',
    title: '6. Campus / Institutional Plans',
    text: 'Refund terms for Campus B2B plans are governed by the specific agreement between InterviewEra and the institution. Please refer to your contract or contact your InterviewEra account manager for details.',
  },
  {
    id: 'contact',
    title: '7. Contact Us',
    text: 'For refund requests, billing queries, or cancellation assistance:',
    contact: {
      email: 'support@interviewera.com',
      address: 'InterviewEra · India',
    },
  },
] as const;

const sectionBase = cn('scroll-mt-24 border-t pt-8 first:border-t-0 first:pt-0');

export default function RefundPage() {
  return (
    <BlogMarketingShell>
      {/* Page header */}
      <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <ReceiptText className="size-6" aria-hidden />
        </div>
        <p
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--accent-primary)' }}
        >
          Legal
        </p>
        <h1
          className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl"
          style={{ letterSpacing: '-0.028em' }}
        >
          Refund Policy
        </h1>
        <p className="mt-4 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          Effective date: <strong style={{ color: 'var(--text-primary)' }}>1 May 2026</strong>
          &nbsp;·&nbsp; Last updated: <strong style={{ color: 'var(--text-primary)' }}>1 May 2026</strong>
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          We want you to be happy with InterviewEra. Here is our straightforward policy on credits, cancellations, and refunds.
        </p>
      </div>

      {/* Quick-reference highlights */}
      <div className="mx-auto mb-12 max-w-2xl">
        <div
          className="overflow-hidden rounded-2xl border"
          style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}
        >
          <div
            className="border-b px-5 py-3.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent)',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Policy at a glance
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
            {POLICY_HIGHLIGHTS.map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span className="font-medium text-right" style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className={sectionBase} style={{ borderColor: 'var(--card-border)' }}>
            <h2 className="mb-5 text-xl font-bold sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
              {section.title}
            </h2>

            {'text' in section && section.text && !('contact' in section) && !('bullets' in section) && (
              <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {section.text}
              </p>
            )}

            {'content' in section && section.content && (
              <div className="space-y-5">
                {section.content.map((item) => (
                  <div key={item.sub}>
                    <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.sub}
                    </p>
                    <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {'bullets' in section && section.bullets && (
              <>
                {'text' in section && section.text && (
                  <p className="mb-4 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    {section.text}
                  </p>
                )}
                <ul className="space-y-2">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: 'var(--accent-primary)' }}
                        aria-hidden
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {'contact' in section && section.contact && (
              <>
                <p className="mb-3 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                  {section.text}
                </p>
                <div
                  className="rounded-xl border p-4 text-sm"
                  style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}
                >
                  <p style={{ color: 'var(--text-primary)' }}>
                    Email:{' '}
                    <a
                      href={`mailto:${section.contact.email}`}
                      className="font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      {section.contact.email}
                    </a>
                  </p>
                  <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {section.contact.address}
                  </p>
                </div>
              </>
            )}
          </section>
        ))}

        {/* Footer nav */}
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-8 text-sm"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
        >
          <Link href="/privacy" className="transition-opacity hover:opacity-80" style={{ color: 'var(--accent-primary)' }}>
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition-opacity hover:opacity-80" style={{ color: 'var(--accent-primary)' }}>
            Terms &amp; Conditions
          </Link>
          <Link href="/" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            Back to home
          </Link>
        </div>
      </div>
    </BlogMarketingShell>
  );
}
