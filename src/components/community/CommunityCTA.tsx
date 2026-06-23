'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { COMMUNITY_COPY } from '@/lib/community/community';
import {
  hasJoinedCommunity,
  shouldShowInlineCta,
  markPlacementShown,
} from '@/lib/community/storage';
import { CommunityHubLink } from '@/components/community/CommunityHubLink';
import { cn } from '@/lib/utils';

interface CommunityCTAProps {
  placement: string;
  variant?: 'inline' | 'card' | 'compact';
  title?: string;
  subtitle?: string;
  className?: string;
}

export function CommunityCTA({
  placement,
  variant = 'inline',
  title,
  subtitle,
  className,
}: CommunityCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasJoinedCommunity()) return;
    if (!shouldShowInlineCta(placement)) return;
    setVisible(true);
    markPlacementShown(placement);
  }, [placement]);

  if (!visible) return null;

  if (variant === 'inline') {
    return (
      <CommunityHubLink
        placement={placement}
        className={cn(
          'text-sm font-semibold text-[var(--accent-primary)] underline-offset-2 transition-opacity hover:underline hover:opacity-80',
          className,
        )}
      >
        {title ?? COMMUNITY_COPY.heroSecondary}
      </CommunityHubLink>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex flex-col items-start gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
          className,
        )}
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-primary) 20%, var(--card-border))',
          background: 'color-mix(in srgb, var(--accent-primary) 5%, var(--card-bg))',
        }}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title ?? 'Stay updated between sessions'}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {subtitle ?? 'Job alerts, tips, and peer discussions.'}
          </p>
        </div>
        <CommunityHubLink
          placement={placement}
          className="shrink-0 rounded-lg bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white transition-all hover:-translate-y-px hover:opacity-95"
        >
          Explore community →
        </CommunityHubLink>
      </div>
    );
  }

  return (
    <div className={cn('dashboard-premium-card p-5 sm:p-6', className)}>
      <div className="flex items-start gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Users className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {title ?? COMMUNITY_COPY.dashboardTitle}
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {subtitle ?? COMMUNITY_COPY.dashboardSubtitle}
          </p>
          <CommunityHubLink
            placement={placement}
            className="mt-4 inline-flex rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            Explore community hub →
          </CommunityHubLink>
        </div>
      </div>
    </div>
  );
}
