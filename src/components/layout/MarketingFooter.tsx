import Link from 'next/link';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CookieSettingsButton } from '@/components/consent/CookieSettingsButton';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { BrandMarkIcon } from '@/components/brand/BrandMarkIcon';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { NAV_TOOLS_LINKS } from '@/lib/seo/content/nav-links';
import { siteConfig } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

// ── Link data — brand + 4 link columns (Product, Tools, Resources, Company) ──

const PRODUCT_LINKS = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/teams', label: 'For Teams' },
  { href: '/signup', label: 'Start Mock Interview' },
  { href: '/campus', label: 'Campus Placements' },
  { href: '/campus', label: 'Campus Workspace' },
  { href: '/help-center', label: 'Help Center' },
] as const;

/** Matches top-nav "Tools" dropdown — room to grow as free tools ship. */
const TOOLS_LINKS = NAV_TOOLS_LINKS;

/** Prep content — hub links preserve SEO paths for deeper guides. */
const RESOURCES_LINKS = [
  { href: '/interview-questions', label: 'Interview Questions' },
  { href: '/resources', label: 'All Resources' },
  { href: '/blog', label: 'Blog' },
  { href: '/community', label: 'Community Hub' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Topic Map' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Guide' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Guide' },
] as const;

const COMPANY_LINKS = [
  { href: '/interviewera', label: 'What is InterviewEra' },
  { href: '/about', label: 'About Us' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/contact', label: 'Contact' },
] as const;

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/refund', label: 'Refund Policy' },
] as const;

const LINK_SECTIONS = [
  { heading: 'Product', links: PRODUCT_LINKS },
  { heading: 'Tools', links: TOOLS_LINKS },
  { heading: 'Resources', links: RESOURCES_LINKS },
  {
    heading: 'Company',
    links: [...COMPANY_LINKS, ...LEGAL_LINKS],
  },
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
  'text-sm transition-[opacity,transform] duration-200 hover:opacity-100 hover:translate-x-0.5 inline-block motion-reduce:transform-none';

const COL_HEADING_CLS = 'text-xs font-semibold uppercase tracking-widest';

// ── Component ──────────────────────────────────────────────────────────────────

export function MarketingFooter() {
  return (
    <footer
      className="ie-marketing-footer border-t"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
      }}
      aria-label="Site footer"
    >
      {/* Main grid — brand block + link columns */}
      <div className={cn(LANDING_PAGE_CONTAINER, 'px-4 py-10 sm:px-5 sm:py-12 md:py-16')}>
        <div className="grid gap-8 sm:gap-10 md:grid-cols-12 md:gap-8 lg:gap-8 xl:gap-10">

          {/* ── Brand column ───────────────────────────────────────────── */}
          <div className="min-w-0 md:col-span-4 lg:col-span-3">
            <BrandHomeLink variant="footer" />
            {/* Canonical brand statement — kept in sync via siteConfig.entityDefinition. */}
            <p
              className="mt-3 max-w-prose text-sm leading-relaxed sm:mt-4 sm:max-w-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              <strong style={{ color: 'var(--text-primary)' }}>InterviewEra</strong>
              {siteConfig.entityDefinition.replace(/^InterviewEra/, '')}
            </p>

            {/* CTA — full width on phones for a reliable tap target */}
            <TrackedCtaLink
              href="/signup"
              ctaKey={CTA_KEYS.START_MOCK_INTERVIEW}
              ctaText="Start Mock Interview"
              section="footer"
              className="landing-cta-lift mt-4 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white hover:opacity-90 sm:mt-5 sm:w-auto sm:py-2.5"
              style={{
                background: 'var(--accent-primary)',
                boxShadow: '0 8px 24px color-mix(in srgb, var(--accent-primary) 35%, transparent)',
              }}
            >
              Start Mock Interview
            </TrackedCtaLink>

            {/* Social icons */}
            <div className="mt-4 flex items-center gap-3 sm:mt-5">
              {SOCIAL_LINKS.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-lg border transition-[transform,border-color] duration-200 hover:scale-105 hover:border-(--accent-primary) motion-reduce:transform-none sm:h-9 sm:w-9"
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

          {/* ── Link columns — 2 col mobile-first, 4 col lg+ ─── */}
          <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-8 md:col-span-8 lg:col-span-9 lg:grid-cols-4 lg:gap-6 xl:gap-8">
            {LINK_SECTIONS.map(({ heading, links }) => (
              <div key={heading} className="min-w-0">
                <p
                  className={COL_HEADING_CLS}
                  style={{ color: 'var(--text-muted)' }}
                >
                  {heading}
                </p>
                <ul className="mt-3 space-y-2 sm:mt-4 sm:space-y-2.5" role="list">
                  {links.map(({ href, label }) => (
                    <li key={label} className="min-w-0">
                      <Link
                        href={href}
                        prefetch={href === '/campus' ? false : undefined}
                        className={cn(LINK_CLS, 'break-words')}
                        style={{ color: 'var(--text-secondary)', opacity: 0.85 }}
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar — copyright + legal */}
      <div className="border-t" style={{ borderColor: 'var(--card-border)' }}>
        <div
          className={cn(
            LANDING_PAGE_CONTAINER,
            'flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-5',
          )}
          style={{ color: 'var(--text-muted)' }}
        >
          <p className="flex min-w-0 items-center gap-2 text-xs">
            <BrandMarkIcon size={20} className="h-5 w-5 opacity-90" />
            <span className="min-w-0">© 2026 InterviewEra. All rights reserved.</span>
          </p>
          <nav
            className="flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2 sm:gap-y-1"
            aria-label="Legal"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {LEGAL_LINKS.map(({ href, label }, i) => (
                <span key={label} className="inline-flex items-center gap-x-2">
                  {i > 0 && <span aria-hidden className="opacity-40">|</span>}
                  <Link
                    href={href}
                    className="font-medium transition-colors hover:text-[var(--accent-primary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {label}
                  </Link>
                </span>
              ))}
              <span className="inline-flex items-center gap-x-2">
                <span aria-hidden className="opacity-40">|</span>
                <CookieSettingsButton className="font-medium transition-colors hover:text-[var(--accent-primary)]" />
              </span>
              <span className="inline-flex items-center gap-x-2">
                <span aria-hidden className="opacity-40">|</span>
                <Link
                  href="/privacy#cookies"
                  className="font-medium transition-colors hover:text-[var(--accent-primary)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cookie Policy
                </Link>
              </span>
            </div>
            <span className="hidden opacity-40 sm:inline" aria-hidden>|</span>
            <span>Ranchi, Jharkhand, India</span>
          </nav>
        </div>
      </div>
    </footer>
  );
}
