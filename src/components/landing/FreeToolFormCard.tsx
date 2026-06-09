'use client';

import type { CSSProperties, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { cn } from '@/lib/utils';

interface FreeToolFormCardProps {
  /** Small uppercase label (e.g. "Analyzer", "Generator") */
  headerEyebrow: string;
  /** Primary line in the header strip */
  headerTitle: string;
  /** Supporting line under title */
  headerSubtitle?: ReactNode;
  /** Optional right-side chip in header (e.g. "10 questions") */
  headerBadge?: ReactNode;
  className?: string;
  children: ReactNode;
}

const cardShell =
  'overflow-hidden rounded-[22px] border-2 shadow-2xl lg:rounded-3xl';

const cardShellStyle: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
  boxShadow:
    'var(--card-shadow), 0 0 64px color-mix(in srgb, var(--accent-primary) 12%, transparent), 0 0 0 1px color-mix(in srgb, white 45%, transparent) inset',
};

const headerStripStyle: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
};

/**
 * Premium form card chrome shared by ATS, question generator, and STAR builder.
 */
export function FreeToolFormCard({
  headerEyebrow,
  headerTitle,
  headerSubtitle,
  headerBadge,
  className,
  children,
}: FreeToolFormCardProps) {
  return (
    <div className={cn(cardShell, className)} style={cardShellStyle}>
      <div className="border-b px-5 py-4 sm:px-7 sm:py-5" style={headerStripStyle}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              {headerEyebrow}
            </p>
            <p className="mt-1 text-sm font-semibold sm:text-base lg:text-lg" style={{ color: 'var(--text-primary)' }}>
              {headerTitle}
            </p>
            {headerSubtitle ? (
              <p className="mt-1 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                {headerSubtitle}
              </p>
            ) : null}
          </div>
          {headerBadge ? <div className="shrink-0">{headerBadge}</div> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

export function FreeToolCtaBlock({
  title,
  body,
  href,
  ctaLabel,
  section = 'tool_cta',
}: {
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
  section?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[22px] border-2 p-6 text-center sm:p-8 lg:rounded-3xl"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
        background:
          'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 18%, var(--card-bg)) 0%, var(--card-bg) 55%)',
        boxShadow: 'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 14%, transparent)',
      }}
    >
      <p className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        {body}
      </p>
      <TrackedCtaLink
        href={href}
        ctaKey={CTA_KEYS.TOOL_CTA}
        ctaText={ctaLabel}
        section={section}
        className="landing-cta-lift mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-6 text-sm font-semibold text-white sm:h-12 sm:px-8 sm:text-base"
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
          boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
        }}
      >
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </TrackedCtaLink>
    </div>
  );
}
