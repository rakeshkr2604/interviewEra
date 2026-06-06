import Link from 'next/link';
import Image from 'next/image';
import { BrandHomeLink, BRAND_MARK_PATH } from '@/components/brand/BrandHomeLink';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import {
  FOOTER_INTERVIEW_QUESTIONS_LINKS,
  FOOTER_RESOURCES_LINKS,
} from '@/lib/seo/content/nav';
import { siteConfig } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

// ── Link data ──────────────────────────────────────────────────────────────────

const PRODUCT_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/signup', label: 'Start Mock Interview' },
  { href: '/campus', label: 'Campus Hiring' },
  { href: '/help-center', label: 'Help Center' },
] as const;

const TOOLS_LINKS = [
  { href: '/tools/question-generator', label: 'Question Generator' },
  { href: '/tools/ats-checker', label: 'ATS Resume Checker' },
  { href: '/tools/star-builder', label: 'STAR Answer Builder' },
] as const;

const QUESTIONS_LINKS = FOOTER_INTERVIEW_QUESTIONS_LINKS;

const RESOURCES_LINKS = FOOTER_RESOURCES_LINKS;

/** Company column — rendered separately so the Razorpay trust chip can sit inline under Pricing. */
const COMPANY_LINKS = [
  { href: '/interviewera', label: 'What is InterviewEra' },
  { href: '/about', label: 'About Us' },
  { href: '/pricing', label: 'Pricing' },
  { href: 'mailto:support@interviewera.com', label: 'Contact' },
] as const;

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund', label: 'Refund' },
] as const;

/** First 4 columns rendered generically — Company is rendered separately. */
const LINK_SECTIONS = [
  { heading: 'Mock Interview', links: PRODUCT_LINKS },
  { heading: 'Free Tools', links: TOOLS_LINKS },
  { heading: 'Interview Questions', links: QUESTIONS_LINKS },
  { heading: 'Resources', links: RESOURCES_LINKS },
] as const;

// ── Social icons ───────────────────────────────────────────────────────────────

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { href: 'https://www.linkedin.com/company/interviewera/', label: 'InterviewEra on LinkedIn', Icon: LinkedInIcon },
  { href: 'https://x.com/InterviewEra', label: 'InterviewEra on X', Icon: XIcon },
  { href: 'https://github.com/InterviewEraHQ', label: 'InterviewEra on GitHub', Icon: GitHubIcon },
] as const;

// ── Shared styles ──────────────────────────────────────────────────────────────

const LINK_CLS =
  'text-sm transition-all duration-200 hover:opacity-100 hover:translate-x-0.5 inline-block';

const COL_HEADING_CLS = 'text-xs font-semibold uppercase tracking-widest';

// ── Component ──────────────────────────────────────────────────────────────────

export function MarketingFooter() {
  return (
    <footer
      className="border-t"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      aria-label="Site footer"
    >
      {/* Main grid — brand (3 cols) + 5 link columns (9 cols) */}
      <div className={cn(LANDING_PAGE_CONTAINER, 'px-4 py-14 sm:px-5 md:py-16')}>
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">

          {/* ── Brand column ───────────────────────────────────────────── */}
          <div className="md:col-span-3">
            <BrandHomeLink variant="footer" />
            {/* Canonical brand statement — kept in sync via siteConfig.entityDefinition. */}
            <p
              className="mt-4 max-w-xs text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>InterviewEra</strong>
              {siteConfig.entityDefinition.replace(/^InterviewEra/, '')}
            </p>

            {/* CTA */}
            <Link
              href="/signup"
              className="mt-5 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 hover:-translate-y-px"
              style={{
                background: 'var(--accent-primary)',
                boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 35%, transparent)',
              }}
            >
              Start Mock Interview
            </Link>

            {/* Social icons */}
            <div className="mt-5 flex items-center gap-3">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 hover:scale-105 hover:border-(--accent-primary)"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Link columns — 2×2 on sm/md, 5×1 on lg ────────────────── */}
          <div className="grid grid-cols-2 gap-8 md:col-span-9 lg:grid-cols-5">

            {/* Generic columns */}
            {LINK_SECTIONS.map(({ heading, links }) => (
              <div key={heading}>
                <p
                  className={COL_HEADING_CLS}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {heading}
                </p>
                <ul className="mt-4 space-y-2.5" role="list">
                  {links.map(({ href, label }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className={LINK_CLS}
                        style={{ color: 'var(--text-secondary)', opacity: 0.85 }}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Company column — rendered separately for Razorpay badge */}
            <div>
              <p
                className={COL_HEADING_CLS}
                style={{ color: 'var(--text-muted)' }}
              >
                Company
              </p>
              <ul className="mt-4 space-y-2.5" role="list">
                {COMPANY_LINKS.map(({ href, label }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className={LINK_CLS}
                      style={{ color: 'var(--text-secondary)', opacity: 0.85 }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div
          className={cn(
            LANDING_PAGE_CONTAINER,
            'flex flex-col gap-2 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5',
          )}
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="flex items-center gap-2">
            <Image
              src={BRAND_MARK_PATH}
              width={20}
              height={20}
              className="h-5 w-5 shrink-0 opacity-90"
              alt=""
              aria-hidden
            />
            <span>© 2026 InterviewEra. All rights reserved.</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 opacity-70">
            {LEGAL_LINKS.map(({ href, label }) => (
              <Link
                key={label}
                href={href}
                className="transition-opacity hover:opacity-100"
              >
                {label}
              </Link>
            ))}
            <span>Ranchi, Jharkhand, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
