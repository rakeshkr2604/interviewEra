import { ExternalLink } from 'lucide-react';
import { BRAND_GITHUB_URL, BRAND_LINKEDIN_URL, BRAND_X_URL } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

/** Official, externally-linkable InterviewEra brand profiles — kept in sync with schema `sameAs`. */
const BRAND_PROFILES = [
  {
    href: BRAND_LINKEDIN_URL,
    label: 'InterviewEra on LinkedIn',
    handle: 'linkedin.com/company/interviewera',
  },
  {
    href: BRAND_X_URL,
    label: 'InterviewEra on X',
    handle: 'x.com/InterviewEra',
  },
  {
    href: BRAND_GITHUB_URL,
    label: 'InterviewEra on GitHub',
    handle: 'github.com/InterviewEraHQ',
  },
] as const;

interface BrandWebProfilesProps {
  className?: string;
  /** Unique id for the section heading (a11y `aria-labelledby`). */
  headingId?: string;
}

/**
 * Server-rendered list of official brand profiles. Plain `<a>` anchors with descriptive
 * text + `rel="me"` so crawlers can validate InterviewEra as one entity across platforms.
 */
export function BrandWebProfiles({
  className,
  headingId = 'brand-web-profiles-heading',
}: BrandWebProfilesProps) {
  return (
    <section className={cn('mt-12 sm:mt-14', className)} aria-labelledby={headingId}>
      <h2 id={headingId} className="text-2xl font-bold tracking-tight sm:text-3xl">
        InterviewEra on the web
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        InterviewEra official profiles across the web — follow and verify the brand on each platform.
      </p>

      <nav aria-label="InterviewEra official profiles">
        <ul className="mt-6 grid list-none gap-3 p-0 sm:grid-cols-3" role="list">
          {BRAND_PROFILES.map(({ href, label, handle }) => (
            <li key={href} className="p-0">
              <a
                href={href}
                target="_blank"
                rel="me noopener noreferrer"
                aria-label={`${label} (opens in a new tab)`}
                className="flex items-center justify-between gap-3 rounded-xl border-2 p-4 transition-colors hover:border-(--accent-primary)"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <span className="flex flex-col">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {label}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {handle}
                  </span>
                </span>
                <ExternalLink className="size-3.5 shrink-0 opacity-60" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
