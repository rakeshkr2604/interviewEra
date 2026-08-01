'use client';

import type { ComponentProps, ReactNode } from 'react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';

type StartFreeCtaLinkProps = Omit<
  ComponentProps<typeof TrackedCtaLink>,
  'ctaKey' | 'ctaText' | 'section'
> & {
  section: string;
  ctaText?: string;
  children: ReactNode;
};

/** Standard primary homepage CTA — single analytics key everywhere. */
export function StartFreeCtaLink({
  section,
  ctaText = 'Start Free Mock Interview',
  href = '/signup',
  children,
  ...linkProps
}: StartFreeCtaLinkProps) {
  return (
    <TrackedCtaLink
      href={href}
      ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
      ctaText={ctaText}
      section={section}
      {...linkProps}
    >
      {children}
    </TrackedCtaLink>
  );
}
