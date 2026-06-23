'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { COMMUNITY_COPY, COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { trackCommunityView, trackCommunityInteraction } from '@/lib/community/analytics';
import { dismissBanner, shouldShowBanner } from '@/lib/community/storage';
import { useCommunityStorageSnapshot } from '@/lib/community/use-community-storage';
import { CommunityHubLink } from '@/components/community/CommunityHubLink';
import { cn } from '@/lib/utils';

interface CommunityBannerProps {
  placement?: 'landing_banner' | 'dashboard_banner';
  className?: string;
}

export function CommunityBanner({
  placement = 'landing_banner',
  className,
}: CommunityBannerProps) {
  const pathname = usePathname() ?? '';
  const storageShow = useCommunityStorageSnapshot(shouldShowBanner, () => false);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const viewedRef = useRef(false);

  const onCommunityHub =
    pathname === COMMUNITY_HUB_PATH || pathname.startsWith(`${COMMUNITY_HUB_PATH}/`);
  const show = !onCommunityHub && storageShow && !dismissedLocally;

  useEffect(() => {
    if (!show || viewedRef.current) return;
    viewedRef.current = true;
    const wasDismissed =
      typeof window !== 'undefined' &&
      Boolean(localStorage.getItem('ie-community-banner-dismissed-at'));
    trackCommunityView(placement, {
      banner_return: wasDismissed ? 'true' : 'false',
    });
  }, [show, placement]);

  if (!show) return null;

  function dismiss() {
    dismissBanner();
    setDismissedLocally(true);
    trackCommunityInteraction('community_banner_dismiss', {
      platform: 'dismiss',
      placement,
    });
  }

  return (
    <div
      className={cn('relative border-b text-center text-sm', className)}
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--bg-secondary))',
        color: 'var(--text-primary)',
      }}
      role="region"
      aria-label="Community announcement"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-2.5 sm:px-5">
        <p className="min-w-0 flex-1 text-xs leading-snug sm:text-sm">
          <span className="hidden sm:inline">{COMMUNITY_COPY.bannerMessage}</span>
          <span className="sm:hidden">Daily job alerts & interview tips.</span>
        </p>
        <CommunityHubLink
          placement={placement}
          className="shrink-0 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 sm:text-sm"
        >
          {COMMUNITY_COPY.bannerCta}
        </CommunityHubLink>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)]"
          aria-label="Dismiss community banner"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
