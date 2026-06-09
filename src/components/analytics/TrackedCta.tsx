'use client';

import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { CtaKey } from '@/lib/analytics/cta-keys';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';

type TrackedCtaLinkProps = Omit<ComponentProps<typeof Link>, 'onClick'> & {
  ctaKey: CtaKey;
  ctaText: string;
  section: string;
  authenticated?: boolean;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export function TrackedCtaLink({
  ctaKey,
  ctaText,
  section,
  authenticated,
  onClick,
  children,
  ...linkProps
}: TrackedCtaLinkProps) {
  const pathname = usePathname();

  return (
    <Link
      {...linkProps}
      onClick={(event) => {
        trackLandingCtaClicked({
          ctaKey,
          ctaText,
          section,
          page: pathname,
          authenticated,
        });
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}

/** Attach CTA tracking to button/form handlers. */
export function trackCtaClick(
  params: {
    ctaKey: CtaKey;
    ctaText: string;
    section: string;
    page?: string;
    authenticated?: boolean;
  },
  originalHandler?: (event: MouseEvent<HTMLElement>) => void,
): (event: MouseEvent<HTMLElement>) => void {
  return (event) => {
    trackLandingCtaClicked(params);
    originalHandler?.(event);
  };
}
