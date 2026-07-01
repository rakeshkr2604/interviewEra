import type { Metadata } from 'next';
import Link from 'next/link';
import { ReceiptText } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { MarketingPageHeader } from '@/components/layout/MarketingPageHeader';
import { generateMetadata } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

export const metadata: Metadata = generateMetadata({
  title: 'Refund Policy',
  description:
    "Understand InterviewEra's refund policy for one-time plan payments and credits.",
  path: '/refund',
});

const POLICY_HIGHLIGHTS = [
  { label: 'Credit refunds', value: 'Technical issues only' },
  { label: 'Plan access period', value: '30 days per payment' },
  { label: 'Auto-renewal', value: 'None — renew manually' },
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
        text: 'The lifetime free credits (3 for new signups, 5 for accounts created before May 14, 2026) cannot be refunded or transferred. Unused free credits do not carry over if you delete your account.',
      },
    ],
  },
  {
    id: 'plans',
    title: '2. Paid Plan Payments',
    content: [
      {
        sub: 'One-Time Access (Starter & Pro)',
        text: 'Starter and Pro are one-time payments that grant 30 days of plan access and a fixed credit allowance for that period. There is no auto-renewal. When access expires, your account returns to the free tier unless you pay again.',
      },
      {
        sub: 'Early Renewal',
        text: 'You may renew before your current period ends from Settings → Billing. A new payment extends your access from your existing expiry date and refreshes your plan credits.',
      },
      {
        sub: 'Refund Eligibility',
        text: 'One-time plan payments are generally non-refundable once access has been granted, except where required by law or where a billing error occurred. Unused credits within an active 30-day period are not refundable on their own.',
      },
    ],
  },
  {
    id: 'prorated',
    title: '3. Pro-Rated Refunds',
    text: 'We do not offer pro-rated refunds for partial access periods or unused credits on paid plans. For example, if you purchase Pro and use 10 credits, you will not receive a partial refund for the remaining credits if your 30-day period ends. Billing errors and technical issues are handled as described below.',
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
      <MarketingPageHeader
        className="mb-12 sm:mb-16"
        leading={
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <ReceiptText className="size-6" aria-hidden />
          </div>
        }
        eyebrow="Legal"
        title="Refund Policy"
        subtitle={
          <>
            <span className="block text-sm sm:text-base">
              Effective date: <strong className="text-[var(--text-primary)]">1 May 2026</strong>
              &nbsp;·&nbsp; Last updated: <strong className="text-[var(--text-primary)]">1 May 2026</strong>
            </span>
            <span className="mt-3 block text-sm leading-relaxed">
              We want you to be happy with InterviewEra. Here is our straightforward policy on credits, cancellations, and refunds.
            </span>
          </>
        }
      />

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
