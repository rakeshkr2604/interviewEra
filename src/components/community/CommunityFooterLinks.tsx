'use client';

import Link from 'next/link';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { getClickablePlatformsForSurface } from '@/lib/community/selectors';
import { CommunityLink } from '@/components/community/CommunityLink';
import { CommunityPlatformIcon } from '@/components/community/CommunityIcons';

export function CommunityFooterLinks() {
  const links = getClickablePlatformsForSurface('footer');
  if (links.length === 0) return null;

  return (
    <div>
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}
      >
        Community
      </p>
      <ul className="mt-4 space-y-2.5" role="list">
        <li>
          <Link
            href={COMMUNITY_HUB_PATH}
            className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] opacity-85 transition-[opacity,transform] duration-200 hover:translate-x-0.5 hover:opacity-100 motion-reduce:transform-none"
          >
            Community Hub
          </Link>
        </li>
        {links.slice(0, 4).map((platform) => (
          <li key={platform.id}>
            <CommunityLink
              href={platform.url}
              platform={platform.analyticsName}
              platformId={platform.id}
              placement="landing_footer"
              analyticsEvent="footer_community_click"
              trackJoin={platform.category === 'community' || platform.category === 'channel'}
              className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] opacity-85 transition-[opacity,transform] duration-200 hover:translate-x-0.5 hover:opacity-100 motion-reduce:transform-none"
            >
              <CommunityPlatformIcon platformId={platform.icon} className="size-3.5 shrink-0 opacity-70" />
              {platform.title}
            </CommunityLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
