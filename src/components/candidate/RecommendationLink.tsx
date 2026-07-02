'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackCandidateEvent } from '@/lib/analytics/candidate-events';

export function RecommendationLink({
  href,
  recommendationId,
  recommendationType,
  source,
  children,
  className,
}: {
  href: string;
  recommendationId: string;
  recommendationType: string;
  source: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackCandidateEvent('recommendation_clicked', {
          recommendation_id: recommendationId,
          recommendation_type: recommendationType,
          source,
        })
      }
    >
      {children}
    </Link>
  );
}
