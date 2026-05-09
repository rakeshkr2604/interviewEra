import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { generateMetadata } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

export const metadata: Metadata = generateMetadata({
  title: 'Privacy Policy',
  description:
    'Learn how InterviewEra collects, uses, and protects your personal data. We are committed to keeping your information safe.',
  path: '/privacy',
});

const SECTIONS = [
  {
    id: 'data-collected',
    title: '1. Information We Collect',
    content: [
      {
        sub: 'Account & Profile',
        text: 'When you register, we collect your name, email address, and (optionally) your target role and placement date. We do not collect payment card numbers directly — card processing is handled by Razorpay.',
      },
      {
        sub: 'Resume Data',
        text: 'When you upload a resume, we store the original file in Supabase Storage and extract structured data (skills, experience, education) via AI parsing. This parsed data is used solely to personalise your interview questions.',
      },
      {
        sub: 'Interview Transcripts',
        text: 'Your answers to mock interview questions, AI-generated scores, and feedback are stored in our database so you can review your history and track progress over time.',
      },
      {
        sub: 'Usage & Analytics',
        text: 'We collect anonymised usage events (pages visited, features used, session duration) via Vercel Analytics to understand product usage and improve the platform. No personally identifiable data is shared with analytics providers.',
      },
      {
        sub: 'Payment Information',
        text: 'Subscription transactions are processed by Razorpay. We store your subscription status and plan tier, but we never receive or store raw card details.',
      },
    ],
  },
  {
    id: 'how-we-use',
    title: '2. How We Use Your Information',
    bullets: [
      'Deliver and personalise your mock interview sessions',
      'Generate AI-powered questions tailored to your resume and target role',
      'Store and display your performance history and score trends',
      'Process subscription payments and manage your plan',
      'Send transactional emails (welcome, password reset, billing receipts) via Resend',
      'Detect and prevent abuse, fraud, and violations of our Terms',
      'Improve our AI models and platform features using aggregated, de-identified data',
    ],
    footer: 'We do not use your data for targeted advertising. We do not sell your personal information to third parties.',
  },
  {
    id: 'cookies',
    title: '3. Cookies & Local Storage',
    content: [
      {
        sub: 'Session Cookies',
        text: 'We use Supabase Auth session cookies to keep you signed in across page visits. These are strictly necessary for the service to function.',
      },
      {
        sub: 'Theme Preference',
        text: 'Your light/dark mode choice is stored in localStorage under the key "ie-theme". This data never leaves your browser.',
      },
      {
        sub: 'No Advertising Cookies',
        text: 'We do not set any third-party advertising or tracking cookies.',
      },
    ],
  },
  {
    id: 'data-sharing',
    title: '4. Data Sharing & Third Parties',
    content: [
      {
        sub: 'Supabase',
        text: 'Our database and file storage provider. Data is stored in servers located in Singapore (ap-southeast-1) by default. Supabase is SOC 2 Type II compliant.',
      },
      {
        sub: 'OpenAI',
        text: "We send anonymised answer text and resume excerpts to OpenAI's API to generate questions and evaluate responses. We do not send your name, email, or contact details. OpenAI's data usage policy applies.",
      },
      {
        sub: 'Razorpay',
        text: "Payment processing. Your billing data is governed by Razorpay's privacy policy.",
      },
      {
        sub: 'Vercel',
        text: 'Hosting and CDN. Vercel may log IP addresses and request metadata for security and performance.',
      },
      {
        sub: 'Resend',
        text: 'Transactional email delivery. We share only your email address and the content of the email being sent.',
      },
      {
        sub: 'Legal Disclosures',
        text: 'We may disclose your data if required by applicable law, court order, or governmental authority, or to protect the rights and safety of our users.',
      },
    ],
  },
  {
    id: 'security',
    title: '5. Data Security',
    text: 'We implement industry-standard security measures including TLS encryption in transit, Row Level Security (RLS) policies in our database (so each user can only access their own data), and regular security reviews. However, no method of transmission over the Internet is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.',
  },
  {
    id: 'retention',
    title: '6. Data Retention',
    text: 'We retain your account data, resumes, and interview history for as long as your account remains active. If you delete your account, we permanently delete your personal data within 30 days, except where retention is required by law (e.g., billing records may be retained for 7 years as required by Indian GST regulations).',
  },
  {
    id: 'rights',
    title: '7. Your Rights',
    bullets: [
      'Access — request a copy of the personal data we hold about you',
      'Correction — ask us to correct inaccurate or incomplete data',
      'Deletion — request erasure of your data ("right to be forgotten")',
      'Portability — receive your data in a machine-readable format',
      'Objection — object to processing based on legitimate interests',
    ],
    footer: 'To exercise any of these rights, email us at support@interviewera.com. We will respond within 30 days.',
  },
  {
    id: 'children',
    title: '8. Children\'s Privacy',
    text: 'InterviewEra is intended for users aged 18 and above. We do not knowingly collect personal information from children under 18. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.',
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    text: 'We may update this Privacy Policy from time to time. Material changes will be communicated via email or an in-app notification. Continued use of InterviewEra after changes are posted constitutes acceptance of the revised policy.',
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    text: 'For privacy-related queries, data requests, or to report a concern, please contact us at:',
    contact: {
      email: 'support@interviewera.com',
      address: 'InterviewEra · India',
    },
  },
] as const;

const sectionBase = cn(
  'scroll-mt-24 border-t pt-8 first:border-t-0 first:pt-0',
);

export default function PrivacyPage() {
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
          <Shield className="size-6" aria-hidden />
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
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          Effective date: <strong style={{ color: 'var(--text-primary)' }}>1 May 2026</strong>
          &nbsp;·&nbsp; Last updated: <strong style={{ color: 'var(--text-primary)' }}>1 May 2026</strong>
        </p>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          This policy explains what information InterviewEra.com collects, how we use it, and your rights regarding your data.
        </p>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl space-y-10">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className={sectionBase} style={{ borderColor: 'var(--card-border)' }}>
            <h2 className="mb-5 text-xl font-bold sm:text-2xl" style={{ letterSpacing: '-0.02em' }}>
              {section.title}
            </h2>

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

            {'text' in section && section.text && !('contact' in section) && (
              <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                {section.text}
              </p>
            )}

            {'bullets' in section && section.bullets && (
              <>
                <ul className="mb-4 space-y-2">
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
                {'footer' in section && section.footer && (
                  <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    {section.footer}
                  </p>
                )}
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
          <Link href="/terms" className="transition-opacity hover:opacity-80" style={{ color: 'var(--accent-primary)' }}>
            Terms &amp; Conditions
          </Link>
          <Link href="/refund" className="transition-opacity hover:opacity-80" style={{ color: 'var(--accent-primary)' }}>
            Refund Policy
          </Link>
          <Link href="/" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
            Back to home
          </Link>
        </div>
      </div>
    </BlogMarketingShell>
  );
}
