'use client';

import type { ComponentProps } from 'react';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';

type BlogStartFreeCtaProps = Omit<ComponentProps<typeof StartFreeCtaLink>, 'section' | 'ctaKey'> & {
  section?: string;
};

/** Blog article CTA — tracked Start Free with article section slug. */
export function BlogStartFreeCta({
  section = 'blog_article',
  ctaText,
  children,
  ...props
}: BlogStartFreeCtaProps) {
  return (
    <StartFreeCtaLink section={section} ctaText={ctaText} {...props}>
      {children}
    </StartFreeCtaLink>
  );
}
