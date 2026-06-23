'use client';

import Link from 'next/link';
import { trackCommunityInteraction } from '@/lib/community/analytics';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { cn } from '@/lib/utils';

interface CommunityHubLinkProps {
  placement: string;
  className?: string;
  children: React.ReactNode;
  authenticated?: boolean;
}

/** Internal link to the canonical /community hub */
export function CommunityHubLink({
  placement,
  className,
  children,
  authenticated,
}: CommunityHubLinkProps) {
  return (
    <Link
      href={COMMUNITY_HUB_PATH}
      className={cn(
        'inline-flex items-center transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] focus-visible:ring-offset-2',
        className,
      )}
      onClick={() => {
        trackCommunityInteraction('community_hub_click', {
          platform: 'hub',
          placement,
          authenticated,
        });
      }}
    >
      {children}
    </Link>
  );
}
