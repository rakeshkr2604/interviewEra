import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Server-only signup CTA for long-form blog posts.
 * Matches `FreeToolCtaBlock` visuals without importing the shared free-tool card module.
 */
export function BlogSignupCta({
  title,
  body,
  href,
  ctaLabel,
}: {
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
}) {
  const shell: CSSProperties = {
    borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
    background:
      'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 18%, var(--card-bg)) 0%, var(--card-bg) 55%)',
    boxShadow: 'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 14%, transparent)',
  };

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border-2 p-6 text-center sm:p-8 lg:rounded-3xl"
      style={shell}
    >
      <p className="text-base font-semibold sm:text-lg" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        {body}
      </p>
      <Link
        href={href}
        className={cn(
          'landing-cta-lift mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-6 text-sm font-semibold text-white sm:h-12 sm:px-8 sm:text-base',
        )}
        style={{
          background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
          boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
        }}
      >
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
