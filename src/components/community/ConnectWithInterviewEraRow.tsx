'use client';

import type { CommunityPlatform } from '@/lib/community/types';
import { CommunityLink } from '@/components/community/CommunityLink';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ConnectWithInterviewEraRowProps {
  platform: CommunityPlatform;
  placement: string;
  clickable: boolean;
  ctaLabel: string;
}

export function ConnectWithInterviewEraRow({
  platform,
  placement,
  clickable,
  ctaLabel,
}: ConnectWithInterviewEraRowProps) {
  const content = (
    <>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
        style={{
          background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
        }}
        aria-hidden
      >
        {platform.emoji ?? '🔗'}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-sm font-semibold sm:text-base"
          style={{ color: 'var(--text-primary)' }}
        >
          {platform.title}
        </span>
        <span
          className="mt-0.5 block text-xs leading-relaxed sm:text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          {platform.connectNote && !clickable
            ? platform.connectNote
            : platform.description}
        </span>
      </span>
      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 text-xs font-semibold sm:text-sm',
          clickable ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]',
        )}
      >
        {ctaLabel.replace(/\s*→\s*$/, '')}
        {clickable ? <ChevronRight className="size-4" aria-hidden /> : null}
      </span>
    </>
  );

  if (!clickable) {
    return (
      <div
        className="flex w-full items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4"
        style={{ borderColor: 'var(--card-border)' }}
      >
        {content}
      </div>
    );
  }

  return (
    <CommunityLink
      href={platform.url}
      platform={platform.analyticsName}
      platformId={platform.id}
      placement={placement}
      analyticsEvent="community_join_click"
      trackJoin={platform.category === 'community' || platform.category === 'channel'}
      className="flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)] sm:px-5 sm:py-4"
    >
      {content}
    </CommunityLink>
  );
}
