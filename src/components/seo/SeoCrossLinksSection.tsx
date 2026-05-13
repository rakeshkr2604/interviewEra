import type { ReactNode } from 'react';
import Link from 'next/link';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import type { SeoTextLink } from '@/lib/seo/internal-links';
import { cn } from '@/lib/utils';

interface SeoCrossLinksSectionProps {
  /** e.g. "Keep practicing" — visible heading for a11y + skim readers */
  heading: string;
  links: readonly SeoTextLink[];
  className?: string;
  /** Optional extra row (e.g. CTA sentence) */
  footer?: ReactNode;
}

/**
 * Lightweight contextual internal links — server-rendered HTML anchors for crawlers
 * (not dependent on client hydration).
 */
export function SeoCrossLinksSection({ heading, links, className, footer }: SeoCrossLinksSectionProps) {
  return (
    <section
      className={cn('border-t py-10 sm:py-12', className)}
      style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)' }}
      aria-label={heading}
    >
      <div className={cn(LANDING_PAGE_CONTAINER, 'px-4 sm:px-5')}>
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          {heading}
        </h2>
        <ul className="mt-4 flex flex-wrap gap-2.5 p-0 list-none" role="list">
          {links.map((item) => (
            <li key={item.href} className="p-0">
              <Link
                prefetch={false}
                href={item.href}
                className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors hover:border-(--accent-primary) hover:text-(--accent-primary)"
                style={{
                  borderColor: 'var(--card-border)',
                  color: 'var(--text-secondary)',
                  background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        {footer ? <div className="mt-5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{footer}</div> : null}
      </div>
    </section>
  );
}
