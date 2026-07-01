'use client';

import type { CommunityPlatform, CommunityPlacement } from '@/lib/community/types';
import { defaultCtaLabel } from '@/lib/community/community';
import { CommunityPlatformIcon } from '@/components/community/CommunityIcons';
import { CommunityLink } from '@/components/community/CommunityLink';
import { cn } from '@/lib/utils';
import { sanitizeCommunityUrl } from '@/lib/community/urls';
import {
  IE_FOCUS_VISIBLE,
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
} from '@/lib/theme/component-classes';

interface CommunityCardProps {
  platform: CommunityPlatform;
  placement: CommunityPlacement | string;
  className?: string;
  compact?: boolean;
}

export function CommunityCard({
  platform,
  placement,
  className,
  compact = false,
}: CommunityCardProps) {
  const cta = platform.comingSoon
    ? 'Coming soon'
    : (platform.ctaLabel ?? defaultCtaLabel(platform.category));
  const safeUrl = sanitizeCommunityUrl(platform.url);
  const isActionable = !platform.comingSoon && safeUrl;

  return (
    <article
      className={cn(
        'group relative flex flex-col',
        IE_MARKETING_SURFACE_CARD_CLASS,
        isActionable &&
          'hover:shadow-[0_12px_40px_color-mix(in_srgb,var(--accent-primary)_12%,transparent)]',
        platform.comingSoon && 'opacity-80',
        compact ? 'p-4' : 'p-5 sm:p-6',
        className,
      )}
      style={IE_MARKETING_SURFACE_CARD_STYLE}
    >
      {platform.badge ? (
        <span
          className="absolute right-4 top-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          {platform.badge}
        </span>
      ) : null}

      <div className="mb-4 flex items-start gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
            isActionable &&
              'group-hover:bg-[color-mix(in_srgb,var(--accent-primary)_18%,transparent)]',
            compact ? 'size-9' : 'size-11',
          )}
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <CommunityPlatformIcon
            platformId={platform.icon}
            className={compact ? 'size-4' : 'size-5'}
          />
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <h3
            className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}
            style={{ color: 'var(--text-primary)' }}
          >
            {platform.title}
          </h3>
          <p
            className={cn('mt-1 leading-relaxed', compact ? 'text-xs' : 'text-sm')}
            style={{ color: 'var(--text-secondary)' }}
          >
            {platform.longDescription ?? platform.description}
          </p>
        </div>
      </div>

      {isActionable && safeUrl ? (
        <CommunityLink
          href={safeUrl}
          platform={platform.analyticsName}
          platformId={platform.id}
          placement={placement}
          analyticsEvent="community_join_click"
          trackJoin={platform.category === 'community' || platform.category === 'channel'}
          className={cn(
            'mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold',
            'text-[var(--accent-primary)] transition-colors duration-200',
            'group-hover:bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]',
            IE_FOCUS_VISIBLE,
          )}
        >
          {cta}
        </CommunityLink>
      ) : (
        <span
          className="mt-auto inline-flex w-fit rounded-lg px-3 py-2 text-sm font-semibold"
          style={{ color: 'var(--text-muted)' }}
          aria-disabled="true"
        >
          {cta}
        </span>
      )}
    </article>
  );
}
