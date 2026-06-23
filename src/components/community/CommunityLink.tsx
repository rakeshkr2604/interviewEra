'use client';

import type { CommunityAnalyticsEvent, CommunityPlacement } from '@/lib/community/types';
import type { CommunityPlatformId } from '@/lib/community/types';
import { trackCommunityJoin, trackCommunityInteraction } from '@/lib/community/analytics';
import { markPlatformJoined } from '@/lib/community/storage';
import { sanitizeCommunityUrl } from '@/lib/community/urls';
import { cn } from '@/lib/utils';

interface CommunityLinkProps {
  href: string;
  platform: string;
  platformId?: CommunityPlatformId;
  placement: CommunityPlacement | string;
  analyticsEvent?: CommunityAnalyticsEvent;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  /** Marks join in local storage for community/channel — suppresses future prompts */
  trackJoin?: boolean;
  authenticated?: boolean;
}

export function CommunityLink({
  href,
  platform,
  platformId,
  placement,
  analyticsEvent = 'platform_click',
  className,
  children,
  onClick,
  trackJoin = false,
  authenticated,
}: CommunityLinkProps) {
  const safeHref = sanitizeCommunityUrl(href);
  if (!safeHref) return null;

  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={cn(
        'inline-flex items-center transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] focus-visible:ring-offset-2',
        className,
      )}
      onClick={() => {
        trackCommunityInteraction(analyticsEvent, {
          platform,
          placement,
          authenticated,
        });
        if (trackJoin && platformId) {
          markPlatformJoined(platformId);
          trackCommunityJoin(platform, placement);
        }
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
